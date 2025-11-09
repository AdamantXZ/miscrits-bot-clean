// index.js — Miscritbot (WebSocketStream + Fallback + Interactions API)
require("dotenv").config();
const fs = require("fs");
const http = require("http");
const crypto = require("crypto");

console.log("🔧 MISCRITS BOT - WEBSOCKETSTREAM + INTERACTIONS");

// ✅ Servidor HTTP com /health e /interactions
const app = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/interactions") {
    let data = "";
    req.on("data", chunk => (data += chunk));
    req.on("end", () => {
      // Verificar assinatura do Discord
      const signature = req.headers["x-signature-ed25519"];
      const timestamp = req.headers["x-signature-timestamp"];
      const publicKey = process.env.PUBLIC_KEY;

      if (!signature || !timestamp || !publicKey) {
        res.writeHead(401);
        return res.end("Missing signature or public key");
      }

      try {
        const isVerified = crypto.verify(
          null,
          Buffer.from(timestamp + data),
          Buffer.from(publicKey, "hex"),
          Buffer.from(signature, "hex")
        );

        if (!isVerified) {
          res.writeHead(401);
          return res.end("Invalid request signature");
        }
      } catch (err) {
        res.writeHead(401);
        return res.end("Signature verification failed");
      }

      // Parse body
      let body = {};
      try {
        body = JSON.parse(data || "{}");
      } catch {
        res.writeHead(400);
        return res.end("Invalid JSON");
      }

      // ✅ Resposta obrigatória para o Discord (PING verification)
      if (body.type === 1) {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ type: 1 }));
      }

      // ✅ Resposta básica a comandos
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        type: 4,
        data: { content: "✅ Miscritbot recebeu sua interação!", flags: 64 }
      }));
    });
  } else if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ONLINE",
      timestamp: new Date().toISOString(),
      technology: "WebSocketStream + Fallback",
      message: "Miscritbot ativo e rodando no Render"
    }));
  } else {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Miscritbot - Online\nUse /health para status detalhado");
  }
});

// ✅ Porta padrão Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Servidor HTTP ativo na porta ${PORT}`);
  console.log(`🩺 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🤖 Endpoint de Interações: https://miscrit-bot.onrender.com/interactions`);
});

// ✅ Mantém ativo com heartbeat
setInterval(() => {
  http.get(`http://0.0.0.0:${PORT}/health`, () => {}).on("error", () => {});
}, 5 * 60 * 1000);

// ===========================================
// 🔌 CONEXÃO COM DISCORD VIA WEBSOCKETSTREAM
// ===========================================

console.log("🚀 Iniciando WebSocketStream...");

if (typeof WebSocketStream === "undefined") {
  console.log("⚠️ WebSocketStream não disponível, usando WebSocket tradicional...");
  const WebSocket = require("ws");
  implementTraditionalWebSocket(WebSocket);
} else {
  console.log("🎉 WebSocketStream disponível - usando API moderna");
  implementWebSocketStream();
}

// ✅ WEBSOCKETSTREAM MODERNO (Node >= 20)
function implementWebSocketStream() {
  const wsURL = "wss://gateway.discord.gg/?v=10&encoding=json";
  const wss = new WebSocketStream(wsURL);

  let sequence = null;

  wss.opened
    .then(async ({ readable, writable }) => {
      console.log("🎉 CONNECTED - WebSocketStream aberto!");

      const writer = writable.getWriter();
      const identify = {
        op: 2,
        d: {
          token: process.env.BOT_TOKEN,
          properties: {
            $os: "linux",
            $browser: "WebSocketStream",
            $device: "WebSocketStream"
          },
          intents: 1
        }
      };
      await writer.write(JSON.stringify(identify));
      console.log("🔑 Identify enviado");

      const reader = readable.getReader();
      processMessages(reader, writer);
    })
    .catch(err => {
      console.error("❌ Erro no WebSocketStream:", err);
      setTimeout(implementWebSocketStream, 10000);
    });

  wss.closed.then(() => {
    console.log("🔌 DISCONNECTED (WebSocketStream) — reconectando em 10s...");
    setTimeout(implementWebSocketStream, 10000);
  });

  async function processMessages(reader, writer) {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const msg = JSON.parse(value);
      const { op, d, s, t } = msg;
      if (s) sequence = s;

      switch (op) {
        case 10: // Hello
          startHeartbeat(d.heartbeat_interval, writer);
          break;
        case 11: // Heartbeat ACK
          console.log("💓 Heartbeat ACK");
          break;
        case 0:
          if (t === "READY") {
            console.log("🎉 BOT PRONTO via WebSocketStream!");
            console.log(`🤖 ${d.user.username} online!`);
          }
          break;
      }
    }
  }

  function startHeartbeat(interval, writer) {
    setInterval(() => {
      writer.write(JSON.stringify({ op: 1, d: sequence }));
    }, interval);
  }
}

// ✅ WEBSOCKET TRADICIONAL (Fallback)
function implementTraditionalWebSocket(WebSocket) {
  const wsURL = "wss://gateway.discord.gg/?v=10&encoding=json";
  let socket = new WebSocket(wsURL);
  let heartbeatInterval;
  let sequence = null;

  socket.on("open", () => {
    console.log("🎉 CONNECTED - WebSocket tradicional!");
    const identify = {
      op: 2,
      d: {
        token: process.env.BOT_TOKEN,
        properties: { $os: "linux", $browser: "fallback_ws", $device: "fallback_ws" },
        intents: 1
      }
    };
    socket.send(JSON.stringify(identify));
  });

  socket.on("message", msg => {
    const message = JSON.parse(msg);
    const { op, d, s, t } = message;
    if (s) sequence = s;

    switch (op) {
      case 10: // Hello
        heartbeatInterval = setInterval(() => {
          socket.send(JSON.stringify({ op: 1, d: sequence }));
        }, d.heartbeat_interval);
        break;
      case 0: // Dispatch
        if (t === "READY") {
          console.log("🎉 BOT PRONTO via WebSocket tradicional!");
          console.log(`🤖 ${d.user.username} online!`);
        }
        break;
    }
  });

  socket.on("close", () => {
    console.log("🔌 DISCONNECTED - WebSocket tradicional");
    clearInterval(heartbeatInterval);
    setTimeout(() => implementTraditionalWebSocket(WebSocket), 10000);
  });

  socket.on("error", e => console.error("❌ Erro WebSocket:", e.message));
}

// ✅ Encerramento limpo
process.on("SIGTERM", () => {
  console.log("🛑 Encerrando Miscritbot...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 Encerrando Miscritbot...");
  process.exit(0);
});
