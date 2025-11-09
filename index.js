// index.js - Miscritbot com Interactions API e verificação Ed25519
require("dotenv").config();
const http = require("http");
const nacl = require("tweetnacl");
const fetch = require("node-fetch");

// Variáveis de ambiente
const TOKEN = process.env.BOT_TOKEN;
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const APP_ID = process.env.APPLICATION_ID;
const PORT = process.env.PORT || 10000;

// Log inicial
console.log("🔧 MISCRITS BOT - WebSocket + Interactions API");
console.log(`🌐 HTTP ativo na porta ${PORT}`);
console.log("🚀 Conectando ao Discord...");

// =============================================
// ✅ VERIFICAR ASSINATURA DO DISCORD (CORRETO)
// =============================================
function verifyDiscordRequest(req, body) {
  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];
  if (!signature || !timestamp) return false;

  const isValid = nacl.sign.detached.verify(
    Buffer.from(timestamp + body),
    Buffer.from(signature, "hex"),
    Buffer.from(PUBLIC_KEY, "hex")
  );

  if (!isValid) console.error("❌ Assinatura inválida recebida");
  return isValid;
}

// =============================================
// ✅ SERVIDOR HTTP (para /health e /interactions)
// =============================================
const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      status: "ONLINE",
      timestamp: new Date().toISOString(),
      message: "Miscritbot rodando normalmente!"
    }));
  }

  if (req.method === "POST" && req.url === "/interactions") {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", async () => {
      // Verificar assinatura
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

        // Comando de interação
        if (interaction.type === 2) {
          const name = interaction.data?.name;
          console.log(`🔧 Comando recebido: /${name}`);

          // Resposta inicial (defer)
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ type: 5 }));

          // Editar a resposta depois (simulando execução do comando)
          setTimeout(() => {
            fetch(
              `https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}/messages/@original`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  content: `✅ Comando **/${name}** recebido com sucesso!`
                }),
              }
            ).catch(err => console.error("❌ Erro ao enviar resposta:", err.message));
          }, 1000);

          return;
        }

        // Qualquer outro tipo
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ type: 4, data: { content: "✅ Interação recebida!" } }));
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

// =============================================
// ✅ WEBSOCKET SIMPLES (somente para log online)
// =============================================
const WebSocket = require("ws");
const ws = new WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");

ws.on("open", () => {
  console.log("🎉 CONNECTED ao Discord Gateway");

  const identify = {
    op: 2,
    d: {
      token: TOKEN,
      intents: 1,
      properties: { $os: "linux", $browser: "miscritbot", $device: "miscritbot" }
    }
  };

  ws.send(JSON.stringify(identify));
});

ws.on("message", (data) => {
  const msg = JSON.parse(data);
  if (msg.t === "READY") console.log(`🤖 Bot conectado como ${msg.d.user.username}`);
});

ws.on("close", () => console.log("🔌 Gateway fechado"));
ws.on("error", (err) => console.error("🚨 WebSocket error:", err.message));

// =============================================
// ✅ INICIAR SERVIDOR
// =============================================
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Servidor HTTP escutando na porta ${PORT}`);
});
