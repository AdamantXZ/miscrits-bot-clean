require("dotenv").config();
const fs = require("fs");
const http = require("http");
const crypto = require("crypto");

console.log("🔧 MISCRITS BOT - WebSocket + Interactions API");

// =============================
//  WEBSOCKET DISCORD BOT
// =============================

const WebSocket = require("ws");

function startWebSocket() {
  const wsUri = "wss://gateway.discord.gg/?v=10&encoding=json";
  let websocket = new WebSocket(wsUri);
  let heartbeatInterval = null;
  let sequence = null;

  websocket.addEventListener("open", () => {
    console.log("🎉 CONNECTED - WebSocket ativo!");
    const identify = {
      op: 2,
      d: {
        token: process.env.BOT_TOKEN,
        properties: {
          $os: "linux",
          $browser: "miscritbot",
          $device: "miscritbot"
        },
        intents: 1 // apenas para receber READY
      },
    };
    websocket.send(JSON.stringify(identify));
  });

  websocket.addEventListener("message", (e) => {
    const message = JSON.parse(e.data);
    handleMessage(message, websocket);
  });

  websocket.addEventListener("close", () => {
    console.log("🔌 DISCONNECTED - WebSocket fechado");
    clearInterval(heartbeatInterval);
    setTimeout(() => startWebSocket(), 10000);
  });

  websocket.addEventListener("error", (err) => {
    console.error("❌ WebSocket error:", err.message);
  });

  function handleMessage(message, ws) {
    const { op, d, s, t } = message;
    if (s) sequence = s;

    switch (op) {
      case 10: // HELLO
        heartbeatInterval = setInterval(() => {
          const heartbeat = { op: 1, d: sequence };
          ws.send(JSON.stringify(heartbeat));
        }, d.heartbeat_interval);
        break;

      case 0: // DISPATCH
        if (t === "READY") {
          console.log("🤖 Miscritbot online!");
        }
        break;
    }
  }
}

// =============================
//  INTERACTIONS API
// =============================

function verifyDiscordRequest(req, body) {
  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];
  const publicKey = process.env.PUBLIC_KEY;

  if (!signature || !timestamp || !publicKey) return false;

  try {
    const isVerified = crypto.verify(
      null,
      Buffer.from(timestamp + body),
      {
        key: Buffer.from(publicKey, "hex"),
        format: "der",
        type: "spki"
      },
      Buffer.from(signature, "hex")
    );
    return isVerified;
  } catch {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/interactions") {
    let body = "";
    req.on("data", chunk => body += chunk.toString());
    req.on("end", async () => {
      if (!verifyDiscordRequest(req, body)) {
        res.writeHead(401, { "Content-Type": "text/plain" });
        return res.end("invalid request signature");
      }

      const interaction = JSON.parse(body);

      // ✅ Discord verifica o bot com um PING (type 1)
      if (interaction.type === 1) {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ type: 1 }));
      }

      // ✅ Caso chegue uma interação real de comando
      if (interaction.type === 2) {
        const commandName = interaction.data?.name;
        console.log(`🧩 Interação recebida: /${commandName}`);

        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({
          type: 4,
          data: {
            content: `✅ Comando /${commandName} recebido e processado via HTTP!`,
            flags: 64
          }
        }));
      }

      res.writeHead(400);
      res.end();
    });
  }

  else if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ONLINE",
      bot: "Miscritbot",
      timestamp: new Date().toISOString(),
    }));
  }

  else {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Miscritbot active\n");
  }
});

// =============================
//  INICIAR SERVIDOR E BOT
// =============================

const PORT = process.env.PORT || 10000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Servidor HTTP ativo na porta ${PORT}`);
  startWebSocket();
});
