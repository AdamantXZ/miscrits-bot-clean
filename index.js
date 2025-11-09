require("dotenv").config();
const http = require("http");
const crypto = require("crypto");
const WebSocket = require("ws");
const fetch = require("node-fetch");

// =============================================
// 🔧 MISCRITS BOT - WebSocket + Interactions API
// =============================================
console.log("🔧 MISCRITS BOT - WebSocket + Interactions API");

// =============================================
// ✅ DISCORD CONFIGURAÇÕES
// =============================================
const GATEWAY_URL = "wss://gateway.discord.gg/?v=10&encoding=json";
const TOKEN = process.env.BOT_TOKEN;
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const APPLICATION_ID = process.env.APPLICATION_ID;

if (!TOKEN || !PUBLIC_KEY || !APPLICATION_ID) {
  console.error("❌ Variáveis ausentes: BOT_TOKEN, PUBLIC_KEY ou APPLICATION_ID");
  process.exit(1);
}

let ws;
let heartbeatInterval;
let sequence = null;

// =============================================
// ✅ CONEXÃO AO DISCORD GATEWAY
// =============================================
function connectGateway() {
  console.log("🚀 Conectando ao Discord...");
  ws = new WebSocket(GATEWAY_URL);

  ws.on("open", () => {
    console.log("🎉 CONNECTED ao Discord Gateway");
    identify();
  });

  ws.on("message", (data) => handleGatewayMessage(JSON.parse(data)));

  ws.on("close", (code) => {
    console.log(`🔌 Desconectado do Gateway (${code})`);
    clearInterval(heartbeatInterval);
    setTimeout(connectGateway, 10000);
  });

  ws.on("error", (err) => console.error("❌ WebSocket erro:", err.message));
}

// =============================================
// ✅ IDENTIFY
// =============================================
function identify() {
  const payload = {
    op: 2,
    d: {
      token: TOKEN,
      intents: 1,
      properties: {
        os: "linux",
        browser: "miscritsbot",
        device: "miscritsbot",
      },
    },
  };
  ws.send(JSON.stringify(payload));
}

// =============================================
// ✅ HANDLER DE MENSAGENS
// =============================================
function handleGatewayMessage(msg) {
  const { op, t, d, s } = msg;
  if (s) sequence = s;

  switch (op) {
    case 10: // HELLO
      heartbeat(d.heartbeat_interval);
      break;
    case 11: // ACK
      break;
    case 0: // DISPATCH
      handleDispatch(t, d);
      break;
  }
}

// =============================================
// ✅ HEARTBEAT
// =============================================
function heartbeat(interval) {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    ws.send(JSON.stringify({ op: 1, d: sequence }));
  }, interval);
}

// =============================================
// ✅ DISPATCH HANDLER
// =============================================
function handleDispatch(t, d) {
  switch (t) {
    case "READY":
      console.log(`🤖 Bot conectado como ${d.user.username}`);
      break;
    case "INTERACTION_CREATE":
      console.log(`🔧 Interação recebida: ${d.data?.name}`);
      replyInteraction(d);
      break;
  }
}

// =============================================
// ✅ RESPOSTA DE INTERAÇÃO VIA GATEWAY
// =============================================
function replyInteraction(interaction) {
  const response = {
    type: 4,
    data: {
      content: `✅ Recebido: /${interaction.data.name}`,
      flags: 64,
    },
  };

  fetch(`https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(response),
  }).catch((err) => console.error("❌ Erro resposta:", err.message));
}

// =============================================
// ✅ VERIFICAR ASSINATURA DO DISCORD (ED25519 CORRETO)
// =============================================
function verifyDiscordRequest(req, body) {
  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];

  if (!signature || !timestamp) {
    console.error("❌ Faltando cabeçalhos de assinatura");
    return false;
  }

  try {
    const isVerified = crypto.verify(
      null,
      Buffer.from(timestamp + body),
      {
        key: Buffer.from(PUBLIC_KEY, "hex"),
        format: "der",
        type: "spki",
      },
      Buffer.from(signature, "hex")
    );
    return isVerified;
  } catch (err) {
    console.error("❌ Erro ao verificar assinatura:", err.message);
    return false;
  }
}

// =============================================
// ✅ SERVIDOR HTTP (HEALTH + INTERACTIONS)
// =============================================
const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: ws?.readyState === WebSocket.OPEN ? "ONLINE" : "CONNECTING",
        bot: ws?.readyState === WebSocket.OPEN ? "Connected" : "Idle",
        timestamp: new Date().toISOString(),
      })
    );
  }

  // Endpoint principal de interações do Discord
  else if (req.method === "POST" && req.url === "/interactions") {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", async () => {
      if (!verifyDiscordRequest(req, body)) {
        console.error("❌ Assinatura inválida recebida");
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Invalid signature" }));
      }

      try {
        const interaction = JSON.parse(body);

        // ✅ PING do Discord (verificação inicial)
        if (interaction.type === 1) {
          console.log("✅ Ping recebido do Discord - Respondendo...");
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ type: 1 }));
        }

        // ✅ Comando /miscrits
        if (interaction.type === 2) {
          console.log(`🔧 Comando recebido: ${interaction.data?.name}`);

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ type: 5 })); // ACK imediato

          // Resposta após defer
          setTimeout(() => {
            fetch(`https://discord.com/api/v10/webhooks/${APPLICATION_ID}/${interaction.token}/messages/@original`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: `✅ Comando \`/${interaction.data.name}\` recebido com sucesso!`,
              }),
            }).catch((err) => console.error("❌ Erro ao enviar resposta:", err));
          }, 1000);
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ type: 4, data: { content: "✅ Interação processada!" } }));
      } catch (err) {
        console.error("❌ Erro no /interactions:", err.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: "Internal error" }));
      }
    });
  }

  else {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Miscrits Bot - Active");
  }
});

// =============================================
// ✅ INICIAR SERVIDOR
// =============================================
const PORT = process.env.PORT || 10000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 HTTP ativo na porta ${PORT}`);
  connectGateway();
});

// =============================================
// ✅ SHUTDOWN GRACIOSO
// =============================================
process.on("SIGTERM", () => {
  console.log("🛑 Encerrando Miscritbot...");
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("🛑 Encerrando Miscritbot...");
  process.exit(0);
});
