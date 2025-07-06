/**
 * Web server for bot monitoring and health checks
 */

const http = require('http');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const logger = require('../utils/logger');

class WebServer {
  constructor(config, bot) {
    this.config = config;
    this.bot = bot;
    this.server = null;
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.listen(this.config.PORT, () => {
        logger.info(`🌐 Web server started on port ${this.config.PORT}`);
        this.setupKeepAlive();
        resolve();
      });

      this.server.on('error', (error) => {
        logger.error('Web server error:', error);
        reject(error);
      });
    });
  }

  handleRequest(req, res) {
    try {
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Route handling
      switch (req.url) {
        case '/':
          this.handleStatusPage(req, res);
          break;
        case '/health':
          this.handleHealthCheck(req, res);
          break;
        case '/api/status':
          this.handleApiStatus(req, res);
          break;
        case '/api/quota':
          this.handleQuotaInfo(req, res);
          break;
        case '/dashboard.css':
          this.serveStaticFile(req, res, 'dashboard.css', 'text/css');
          break;
        case '/dashboard.js':
          this.serveStaticFile(req, res, 'dashboard.js', 'application/javascript');
          break;
        default:
          this.handle404(req, res);
      }
    } catch (error) {
      logger.error('Error handling request:', error);
      this.handleError(req, res, error);
    }
  }

  handleStatusPage(req, res) {
    const html = this.generateStatusHTML();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  handleHealthCheck(req, res) {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(health));
  }

  handleApiStatus(req, res) {
    const status = this.bot.getStatusReport();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status, null, 2));
  }

  handleQuotaInfo(req, res) {
    const quota = this.bot.quotaManager.getQuotaStatus();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(quota, null, 2));
  }

  serveStaticFile(req, res, filename, contentType) {
    const filePath = path.join(__dirname, '../../public', filename);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } else {
      this.handle404(req, res);
    }
  }

  handle404(req, res) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }

  handleError(req, res, error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }

  generateStatusHTML() {
    const status = this.bot.getStatusReport();
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${status.bot.name} - Status Dashboard</title>
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
            color: #333;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
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
        
        .status-card {
            background: white;
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        
        .status-card:hover {
            transform: translateY(-5px);
        }
        
        .card-header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .card-header h2 {
            color: #4a5568;
            margin-left: 10px;
        }
        
        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
        
        .status-online { background-color: #48bb78; }
        .status-offline { background-color: #f56565; }
        .status-warning { background-color: #ed8936; }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .metric:last-child {
            border-bottom: none;
        }
        
        .metric-label {
            font-weight: 600;
            color: #4a5568;
        }
        
        .metric-value {
            font-weight: 700;
            color: #2d3748;
        }
        
        .progress-bar {
            width: 100%;
            height: 20px;
            background-color: #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #48bb78, #38a169);
            transition: width 0.3s ease;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .badge-success { background-color: #c6f6d5; color: #22543d; }
        .badge-warning { background-color: #fbd38d; color: #744210; }
        .badge-danger { background-color: #fed7d7; color: #742a2a; }
        
        .refresh-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #667eea;
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 50px;
            cursor: pointer;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
        }
        
        .refresh-btn:hover {
            background: #5a6fd8;
            transform: scale(1.05);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 ${status.bot.name}</h1>
            <p>Smart YouTube Chat Bot Dashboard</p>
        </div>
        
        <div class="grid">
            <div class="status-card">
                <div class="card-header">
                    <div class="status-indicator ${status.status.isRunning ? 'status-online' : 'status-offline'}"></div>
                    <h2>Bot Status</h2>
                </div>
                <div class="metric">
                    <span class="metric-label">Status</span>
                    <span class="metric-value badge ${status.status.isRunning ? 'badge-success' : 'badge-danger'}">
                        ${status.status.isRunning ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-label">Version</span>
                    <span class="metric-value">${status.bot.version}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Uptime</span>
                    <span class="metric-value">${status.bot.uptimeFormatted}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Environment</span>
                    <span class="metric-value">${status.bot.environment}</span>
                </div>
            </div>
            
            <div class="status-card">
                <div class="card-header">
                    <div class="status-indicator ${status.status.chatConnected ? 'status-online' : 'status-offline'}"></div>
                    <h2>Stream Status</h2>
                </div>
                <div class="metric">
                    <span class="metric-label">Current Stream</span>
                    <span class="metric-value">${status.status.currentStream === 'none' ? 'No active stream' : status.status.currentStream}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Chat Connected</span>
                    <span class="metric-value badge ${status.status.chatConnected ? 'badge-success' : 'badge-danger'}">
                        ${status.status.chatConnected ? 'Yes' : 'No'}
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-label">Streaming Time</span>
                    <span class="metric-value badge ${status.status.isStreamingTime ? 'badge-success' : 'badge-warning'}">
                        ${status.status.isStreamingTime ? 'Active Hours' : 'Off Hours'}
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-label">Current Game</span>
                    <span class="metric-value">${status.context.currentGame}</span>
                </div>
            </div>
            
            <div class="status-card">
                <div class="card-header">
                    <div class="status-indicator ${status.quota.percentUsed > 80 ? 'status-warning' : 'status-online'}"></div>
                    <h2>API Quota</h2>
                </div>
                <div class="metric">
                    <span class="metric-label">Usage</span>
                    <span class="metric-value">${status.quota.used} / ${status.quota.limit}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${status.quota.percentUsed}%"></div>
                </div>
                <div class="metric">
                    <span class="metric-label">Percentage</span>
                    <span class="metric-value badge ${status.quota.percentUsed > 80 ? 'badge-warning' : 'badge-success'}">
                        ${status.quota.percentUsed}%
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-label">Resets At</span>
                    <span class="metric-value">${new Date(status.quota.resetTime).toLocaleTimeString()}</span>
                </div>
            </div>
            
            <div class="status-card">
                <div class="card-header">
                    <div class="status-indicator status-online"></div>
                    <h2>Chat Context</h2>
                </div>
                <div class="metric">
                    <span class="metric-label">Chat Mood</span>
                    <span class="metric-value">${status.context.chatMood}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Game State</span>
                    <span class="metric-value">${status.context.gameState}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Messages Tracked</span>
                    <span class="metric-value">${status.context.messageHistory}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Recent Events</span>
                    <span class="metric-value">${status.context.recentEvents}</span>
                </div>
            </div>
            
            <div class="status-card">
                <div class="card-header">
                    <div class="status-indicator status-online"></div>
                    <h2>Rate Limiting</h2>
                </div>
                <div class="metric">
                    <span class="metric-label">Responses This Hour</span>
                    <span class="metric-value">${status.rateLimiting.hourlyResponses} / ${status.rateLimiting.maxHourlyResponses}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Active Users</span>
                    <span class="metric-value">${status.rateLimiting.activeUsers}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Global Cooldown</span>
                    <span class="metric-value">${status.rateLimiting.globalCooldown / 1000}s</span>
                </div>
            </div>
            
            <div class="status-card">
                <div class="card-header">
                    <div class="status-indicator status-online"></div>
                    <h2>Schedule</h2>
                </div>
                <div class="metric">
                    <span class="metric-label">Streaming Hours</span>
                    <span class="metric-value">${status.schedule.start}:00 - ${status.schedule.end}:00</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Current Hour</span>
                    <span class="metric-value">${new Date().getHours()}:00</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Last Updated</span>
                    <span class="metric-value">${new Date(status.timestamp).toLocaleTimeString()}</span>
                </div>
            </div>
        </div>
    </div>
    
    <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
    
    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);
        
        // Add some interactivity
        document.querySelectorAll('.status-card').forEach(card => {
            card.addEventListener('click', () => {
                card.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    card.style.transform = 'translateY(-5px)';
                }, 100);
            });
        });
    </script>
</body>
</html>`;
  }

  setupKeepAlive() {
    const domain = this.config.RAILWAY_PUBLIC_DOMAIN || this.config.RENDER_EXTERNAL_URL;
    
    if (domain) {
      setInterval(() => {
        axios.get(`https://${domain}/health`)
          .then(() => logger.debug('🏓 Keep-alive ping successful'))
          .catch(() => logger.debug('🏓 Keep-alive ping failed (normal during startup)'));
      }, 25 * 60 * 1000); // Every 25 minutes
      
      logger.info(`🏓 Keep-alive pings configured for: https://${domain}`);
    }
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('🌐 Web server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = WebServer;