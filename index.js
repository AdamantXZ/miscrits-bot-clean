require("dotenv").config();
const http = require("http");
const crypto = require("crypto");
const { Buffer } = require("node:buffer");
const WebSocket = require("ws");

console.log("🔧 MISCRITS BOT - WebSocket + Interactions API");

// =====================================
//   FUNÇÃO PARA VALIDAR REQUISIÇÕES DO DISCORD
// =====================================
function verifyDiscordRequest(req, body) {
  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];
  const publicKey = process.env.PUBLIC_KEY;

  if (!signature || !timestamp || !publicKey) return false;

  try {
    const isVerified = crypto.verify(
      null,
      Buffer.from(timestamp + body),
      crypto.createPublicKey({
        key: Buffer.from(publicKey, "hex"),
        type: "spki",
        format: "der",
      }),
      Buffer.from(signature, "hex")
    );
    return isVerified;
  } catch (err) {
    console.error("❌ Erro ao verificar assinatura:", err.message);
    return false;
  }
}

// =====================================
//   WEBSOCKET SIMPLES (só para ficar online)
// =====================================
function startWebSocket() {
  const ws = new WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");
  let heartbeatInterval;
  let sequence = null;

  ws.on("open", () => {
    console.log("🎉 CONNECTED ao Discord Gateway");
    ws.send(
      JSON.stringify({
        op: 2,
        d: {
          token: process.env.BOT_TOKEN,
          properties: {
            $os: "linux",
            $browser: "miscritbot",
            $device: "miscritbot",
          },
          intents: 1,
        },
      })
    );
  });

  ws.on("message", (data) => {
    const payload = JSON.parse(data);
    const { op, t, d, s } = payload;
    if (s) sequence = s;

    switch (op) {
      case 10:
        heartbeatInterval = setInterval(() => {
          ws.send(JSON.stringify({ op: 1, d: sequence }));
        }, d.heartbeat_interval);
        break;
      case 0:
        if (t === "READY") {
          console.log(`🤖 Bot conectado como ${d.user.username}`);
        }
        break;
    }
  });

  ws.on("close", () => {
    console.log("🔌 Desconectado, tentando reconectar em 10s...");
    clearInterval(heartbeatInterval);
    setTimeout(startWebSocket, 10000);
  });
}

// =====================================
//   SERVIDOR HTTP - /health e /interactions
// =====================================
const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/interactions") {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", async () => {
      if (!verifyDiscordRequest(req, body)) {
        res.writeHead(401, { "Content-Type": "text/plain" });
        return res.end("invalid request signature");
      }

      const interaction = JSON.parse(body);

      if (interaction.type === 1) {
        // Ping de verificação inicial
        console.log("✅ PING recebido e respondido");
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ type: 1 }));
      }

      // Interações reais
      if (interaction.type === 2) {
        console.log(`💬 Comando recebido: /${interaction.data.name}`);
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(
          JSON.stringify({
            type: 4,
            data: {
              content: `✅ Comando /${interaction.data.name} processado!`,
              flags: 64,
            },
          })
        );
      }

      res.writeHead(400);
      res.end();
    });
  } else if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ONLINE",
        timestamp: new Date().toISOString(),
      })
    );
  } else {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Miscritbot active\n");
  }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 HTTP ativo na porta ${PORT}`);
  startWebSocket();
});
