const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const util = require('util');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3301;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();


// Helper functions
const readConfig = (filename) => {
    try {
        const filePath = path.join(process.cwd(), 'config', filename);
        if (!fs.existsSync(filePath)) return {};
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
    } catch (error) {
        console.error(`Lỗi đọc file ${filename}:`, error);
        return {};
    }
};

// CORS: cho phép mọi domain
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
    'Access-Control-Max-Age': '86400',
};

app.prepare().then(() => {
    const httpServer = createServer(async (req, res) => {
        // Gắn CORS headers cho mọi response
        Object.entries(corsHeaders).forEach(([key, value]) => {
            res.setHeader(key, value);
        });

        // Xử lý preflight OPTIONS
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        try {
            const parsedUrl = parse(req.url, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    });

    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        },
    });

    let lastSocket = null;

    // --- Stream server stdout (console.*) to clients via websocket ---
    const MAX_SERVER_LOGS = 800;
    const serverLogBuffer = [];
    const originalConsole = {
        log: console.log.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        debug: (console.debug ? console.debug.bind(console) : console.log.bind(console)),
    };

    const pushServerLog = (level, args) => {
        try {
            const text = util.format.apply(null, args);
            const payload = { ts: Date.now(), level, text };
            serverLogBuffer.push(payload);
            if (serverLogBuffer.length > MAX_SERVER_LOGS) serverLogBuffer.splice(0, serverLogBuffer.length - MAX_SERVER_LOGS);
            io.emit('server-log', payload);
        } catch (e) {
            // ignore stream errors
        }
    };

    const patchConsole = (level) => {
        console[level] = (...args) => {
            try { originalConsole[level](...args); } catch { /* ignore */ }
            pushServerLog(level, args);
        };
    };

    ['log', 'info', 'warn', 'error', 'debug'].forEach(patchConsole);

    const sendRealtimeData = async (socket) => {
        try {
            const auth = readConfig('auth.json');
            if (!auth || !auth['x-auth-token']) {
                console.log('Chưa có auth token, bỏ qua gửi realtime data');
                return;
            }
            
            const settings = readConfig('setting.json') || {};
            
            // Lấy matches với timeout và error handling
            let matchesData = null;
            try {
                const matchesResponse = await axios({
                    method: 'get',
                    url: `https://api.gotinder.com/v2/matches?locale=vi&count=60&message=0&is_tinder_u=false`,
                    headers: {
                        'authority': 'api.gotinder.com',
                        'accept': 'application/json',
                        'x-auth-token': auth['x-auth-token']
                    },
                    timeout: 10000
                });
                matchesData = matchesResponse.data;
            } catch (matchError) {
                console.error('Lỗi khi lấy matches:', matchError.message);
                matchesData = { data: { matches: [] } };
            }

            socket.emit('realtime-update', {
                matches: matchesData,
                settings
            });
        } catch (error) {
            console.error('Lỗi gửi dữ liệu realtime:', error.message);
            try {
                socket.emit('realtime-update', {
                    matches: { data: { matches: [] } },
                    settings: {}
                });
            } catch (e) {
                console.error('Lỗi khi gửi empty data:', e.message);
            }
        }
    };

    io.on('connection', (socket) => {
        lastSocket = socket;
        console.log('Client connected');

        // Send recent server logs on connect
        if (serverLogBuffer.length > 0) {
            socket.emit('server-log-batch', serverLogBuffer);
        }
        
        sendRealtimeData(socket).catch(err => {
            console.error('Lỗi khi gửi realtime data ban đầu:', err.message);
        });

        socket.on('refresh-realtime-data', () => {
            sendRealtimeData(socket).catch(err => {
                console.error('Lỗi khi refresh realtime data:', err.message);
            });
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected');
        });
    });

    httpServer.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});
