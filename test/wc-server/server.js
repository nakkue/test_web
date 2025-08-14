const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');

const app = express();
app.use(cors());

const PORT = process.env.PORT ? Number(process.env.PORT) : 8081;

const server = app.listen(PORT, () => {
  console.log(`[WS] server listening on ws://localhost:${PORT}`);
});

const wss = new WebSocketServer({ server });

let lastState = null; // 최신 스냅샷

wss.on('connection', (ws, req) => {
  console.log('[WS] client connected:', req.socket?.remoteAddress);
  if (lastState) { try { ws.send(JSON.stringify(lastState)); } catch {} }

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }
    if (msg && msg.type === 'state') {
      lastState = msg;
      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          try { client.send(JSON.stringify(msg)); } catch {}
        }
      });
    }
  });

  ws.on('close', () => console.log('[WS] client disconnected'));
});

app.get('/', (_req, res) => res.send('ws server ok'));
