require("dotenv").config();
const http = require("http");
const crypto = require("crypto");
const WebSocket = require("ws");

// =============================================
// 🔧 MISCRITS BOT - WebSocket + Interactions API
// =============================================
console.log("🔧 MISCRITS BOT - WebSocket + Interactions API");

// =============================================
// ✅ DISCORD GATEWAY CONFIGURAÇÃO
// =============================================
const GATEWAY_URL = "wss://gateway.discord.gg/?v=10&encoding=json";
const TOKEN = process.env.BOT_TOKEN;
const PUBLIC_KEY = process.env.PUBLIC_KEY;

if (!TOKEN || !PUBLIC_KEY) {
  console.error("❌ BOT_TOKEN ou PUBLIC_KEY ausente no Render!");
  process.exit(1);
}

let ws;
let heartbeatInterval;
let sequence = null;

// =============================================
// ✅ FUNÇÃO: CONECTAR AO DISCORD GATEWAY
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

  ws.on("error", (err) => {
    console.error("❌ WebSocket erro:", err.message);
  });
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
// ✅ MENSAGENS DO GATEWAY
// =============================================
function handleGatewayMessage(msg) {
  const { op, t, d, s } = msg;
  if (s) sequence = s;

  switch (op) {
    case 10: // Hello
      const interval = d.heartbeat_interval;
      heartbeat(interval);
      break;

    case 11: // Heartbeat ACK
      // console.log("💓 ACK");
      break;

    case 0: // Dispatch
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
// ✅ EVENTOS DO DISCORD
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
// ✅ RESPONDER INTERAÇÃO (TESTE DE FUNCIONAMENTO)
// =============================================
function replyInteraction(interaction) {
  const interactionId = interaction.id;
  const interactionToken = interaction.token;

  const response = {
    type: 4,
    data: {
      content: `✅ Recebido: /${interaction.data.name}`,
      flags: 64,
    },
  };

  fetch(`https://discord.com/api/v10/interactions/${interactionId}/${interactionToken}/callback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(response),
  }).catch((err) => console.error("❌ Erro resposta:", err.message));
}

// =============================================
// ✅ VERIFICAR ASSINATURA DO DISCORD
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
        key: `-----BEGIN PUBLIC KEY-----\n${PUBLIC_KEY}\n-----END PUBLIC KEY-----`,
        format: "pem",
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

  // Endpoint usado pelo Discord Developer Portal
  else if (req.method === "POST" && req.url === "/interactions") {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      if (!verifyDiscordRequest(req, body)) {
        res.writeHead(401);
        return res.end("Invalid signature");
      }

      try {
        const interaction = JSON.parse(body);
        if (interaction.type === 1) {
          // Ping verification
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ type: 1 }));
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            type: 4,
            data: { content: "✅ Interação recebida com sucesso!" },
          })
        );
      } catch (err) {
        console.error("❌ Erro ao processar /interactions:", err.message);
        res.writeHead(500);
        res.end("Internal error");
      }
    });
  } else {
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
// ✅ FECHAMENTO LIMPO
// =============================================
process.on("SIGTERM", () => {
  console.log("🛑 Encerrando Miscritbot...");
  process.exit(0);
});
process.on("SIGINT", () => {
  console.log("🛑 Encerrando Miscritbot...");
  process.exit(0);
});
