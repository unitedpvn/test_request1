const http = require('http');
const fs = require('fs');
const url = require('url');

// Stats tracking
let stats = {
    currentRPS: 0,
    totalToday: 0,
    peakRPS: 0,
    startTime: Date.now(),
    requestsThisSecond: 0,
    history: Array(60).fill(0)
};

// Reset RPS counter every second
setInterval(() => {
    stats.currentRPS = stats.requestsThisSecond;
    stats.requestsThisSecond = 0;
    
    if (stats.currentRPS > stats.peakRPS) {
        stats.peakRPS = stats.currentRPS;
    }
    
    // Update history
    stats.history.shift();
    stats.history.push(stats.currentRPS);
}, 1000);

// HTML Dashboard
const dashboardHTML = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Request Monitor - Live Server</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            transition: transform 0.3s;
        }
        .stat-card:hover {
            transform: translateY(-5px);
        }
        .stat-label {
            color: #666;
            font-size: 0.9em;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .stat-value {
            font-size: 2.5em;
            font-weight: bold;
            color: #667eea;
        }
        .chart-container {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-bottom: 30px;
        }
        .chart-title {
            font-size: 1.2em;
            margin-bottom: 20px;
            color: #333;
        }
        canvas {
            width: 100%;
            height: 300px;
        }
        .info-box {
            background: white;
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .endpoint {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
            font-family: monospace;
        }
        .status-live {
            display: inline-block;
            width: 12px;
            height: 12px;
            background: #2ecc71;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><span class="status-live"></span> Request Monitor - LIVE</h1>
            <p>Server đang chạy và nhận request thực tế</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Requests/Second</div>
                <div class="stat-value" id="rps">0</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Today</div>
                <div class="stat-value" id="totalToday">0</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Peak RPS</div>
                <div class="stat-value" id="peakRps">0</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Uptime</div>
                <div class="stat-value" id="uptime">0s</div>
            </div>
        </div>

        <div class="chart-container">
            <div class="chart-title">Real-time Request Graph (Last 60 seconds)</div>
            <canvas id="requestChart"></canvas>
        </div>

        <div class="info-box">
            <h3>Endpoints để test:</h3>
            <div class="endpoint">GET /test - Endpoint để gửi request test</div>
            <div class="endpoint">GET /api/stats - Xem stats dạng JSON</div>
            <div class="endpoint">GET / - Dashboard này</div>
            <p style="margin-top: 15px; color: #666;">
                Bạn có thể dùng curl, browser, hoặc bất kỳ tool nào để gửi request đến server này.
            </p>
        </div>
    </div>

    <script>
        const canvas = document.getElementById('requestChart');
        const ctx = canvas.getContext('2d');
        
        function resizeCanvas() {
            canvas.width = canvas.offsetWidth;
            canvas.height = 300;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        function drawChart(data) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const padding = 40;
            const chartWidth = canvas.width - padding * 2;
            const chartHeight = canvas.height - padding * 2;
            const maxValue = Math.max(...data, 10);
            const barWidth = chartWidth / data.length;

            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(padding, padding);
            ctx.lineTo(padding, canvas.height - padding);
            ctx.lineTo(canvas.width - padding, canvas.height - padding);
            ctx.stroke();

            data.forEach((value, index) => {
                const barHeight = (value / maxValue) * chartHeight;
                const x = padding + index * barWidth;
                const y = canvas.height - padding - barHeight;

                const gradient = ctx.createLinearGradient(0, y, 0, canvas.height - padding);
                gradient.addColorStop(0, '#667eea');
                gradient.addColorStop(1, '#764ba2');

                ctx.fillStyle = gradient;
                ctx.fillRect(x, y, barWidth - 2, barHeight);
            });

            ctx.fillStyle = '#666';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('60s ago', padding, canvas.height - padding + 20);
            ctx.fillText('Now', canvas.width - padding, canvas.height - padding + 20);
        }

        function updateStats() {
            fetch('/api/stats')
                .then(res => res.json())
                .then(data => {
                    document.getElementById('rps').textContent = data.currentRPS;
                    document.getElementById('totalToday').textContent = data.totalToday.toLocaleString();
                    document.getElementById('peakRps').textContent = data.peakRPS;
                    
                    const uptime = Math.floor((Date.now() - data.startTime) / 1000);
                    document.getElementById('uptime').textContent = uptime + 's';
                    
                    drawChart(data.history);
                })
                .catch(err => console.error('Error fetching stats:', err));
        }

        updateStats();
        setInterval(updateStats, 1000);
    </script>
</body>
</html>`;

// HTTP Server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // Track request
    stats.requestsThisSecond++;
    stats.totalToday++;
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    
    // Handle different endpoints
    if (pathname === '/' || pathname === '/dashboard') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(dashboardHTML);
    } 
    else if (pathname === '/api/stats') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(stats));
    }
    else if (pathname === '/test') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Request received successfully!');
    }
    else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
    }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║  Request Monitor Server Started!       ║
╚════════════════════════════════════════╝

Server running at: http://localhost:${PORT}

Endpoints:
  - Dashboard: http://localhost:${PORT}/
  - Stats API: http://localhost:${PORT}/api/stats
  - Test:      http://localhost:${PORT}/test

Press Ctrl+C to stop
    `);
});
