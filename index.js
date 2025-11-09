// index.js - Miscritbot com Interactions API e verificação Ed25519 (FINAL)
require("dotenv").config();
const http = require("http");
const nacl = require("tweetnacl");
const fetch = require("node-fetch");

const TOKEN = process.env.BOT_TOKEN;
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const APP_ID = process.env.APPLICATION_ID;
const PORT = process.env.PORT || 10000;

console.log("🔧 MISCRITS BOT - WebSocket + Interactions API");
console.log(`🌐 HTTP ativo na porta ${PORT}`);
console.log("🚀 Conectando ao Discord...");

// ====================================================
// ✅ VERIFICAÇÃO CORRETA USANDO Ed25519 + HEX
// ====================================================
function verifyDiscordRequest(req, rawBody) {
  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];
  if (!signature || !timestamp) return false;

  try {
    // A chave pública fornecida pelo Discord é HEX
    const isVerified = nacl.sign.detached.verify(
      Buffer.from(timestamp + rawBody),
      Buffer.from(signature, "hex"),
      Buffer.from(PUBLIC_KEY, "hex")
    );
    if (!isVerified) console.error("❌ Assinatura inválida recebida");
    return isVerified;
  } catch (err) {
    console.error("❌ Erro ao verificar assinatura:", err.message);
    return false;
  }
}

// ====================================================
// ✅ SERVIDOR HTTP (para /health e /interactions)
// ====================================================
const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(
      JSON.stringify({
        status: "ONLINE",
        timestamp: new Date().toISOString(),
        message: "Miscritbot rodando normalmente!",
      })
    );
  }

  if (req.method === "POST" && req.url === "/interactions") {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", async () => {
      if (!verifyDiscordRequest(req, body)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Invalid request signature" }));
      }

      try {
        const interaction = JSON.parse(body);

        // PING (verificação inicial do Discord)
        if (interaction.type === 1) {
          console.log("✅ Ping recebido do Discord - Respondendo...");
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ type: 1 }));
        }

        // Comando recebido
        if (interaction.type === 2) {
          const name = interaction.data?.name;
          console.log(`🔧 Comando recebido: /${name}`);

          // Resposta inicial (defer)
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ type: 5 }));

          // Enviar mensagem de sucesso
          setTimeout(() => {
            fetch(
              `https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}/messages/@original`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  content: `✅ Comando **/${name}** recebido com sucesso!`,
                }),
              }
            ).catch((err) =>
              console.error("❌ Erro ao enviar resposta:", err.message)
            );
          }, 1000);

          return;
        }

        // Outro tipo de evento
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            type: 4,
            data: { content: "✅ Interação recebida!" },
          })
        );
      } catch (err) {
        console.error("❌ Erro ao processar /interactions:", err.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    });
    return;
  }

  // Rota padrão
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Miscritbot está ativo!");
});

// ====================================================
// ✅ WEBSOCKET (somente para status de conexão)
// ====================================================
const WebSocket = require("ws");
const ws = new WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");

ws.on("open", () => {
  console.log("🎉 CONNECTED ao Discord Gateway");
  const identify = {
    op: 2,
    d: {
      token: TOKEN,
      intents: 1,
      properties: { $os: "linux", $browser: "miscritbot", $device: "miscritbot" },
    },
  };
  ws.send(JSON.stringify(identify));
});

ws.on("message", (data) => {
  const msg = JSON.parse(data);
  if (msg.t === "READY") console.log(`🤖 Bot conectado como ${msg.d.user.username}`);
});

ws.on("close", () => console.log("🔌 Gateway fechado"));
ws.on("error", (err) => console.error("🚨 WebSocket error:", err.message));

// ====================================================
// ✅ INICIAR SERVIDOR
// ====================================================
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Servidor HTTP escutando na porta ${PORT}`);
});
