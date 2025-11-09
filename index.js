// index.js — Miscritbot (versão estável final)
require("dotenv").config();
const http = require("http");
const nacl = require("tweetnacl");
const fetch = require("node-fetch");

const TOKEN = process.env.BOT_TOKEN;
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const APP_ID = process.env.APPLICATION_ID;
const PORT = process.env.PORT || 10000;

// ✅ Importar comandos
const miscritsInfo = require("./commands/miscrits-info.js");
const miscritsDays = require("./commands/miscrits-days.js");
const miscritsTierList = require("./commands/miscrits-tier-list.js");
const miscritsRelics = require("./commands/miscrits-relics.js");
const miscritsEvosMoves = require("./commands/miscrits-evos-moves.js");

const commands = {
  miscrits: {
    "info": miscritsInfo,
    "spawn-days": miscritsDays,
    "tierlist": miscritsTierList,
    "relics": miscritsRelics,
    "moves-and-evos": miscritsEvosMoves
  }
};

console.log("🔧 MISCRITS BOT - WebSocket + Interactions API (final)");
console.log(`🌐 HTTP ativo na porta ${PORT}`);

// =====================
// ✅ Verificação Discord
// =====================
function verifyDiscordRequest(req, rawBody) {
  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];
  if (!signature || !timestamp) return false;

  try {
    const isValid = nacl.sign.detached.verify(
      Buffer.from(timestamp + rawBody),
      Buffer.from(signature, "hex"),
      Buffer.from(PUBLIC_KEY, "hex")
    );
    if (!isValid) console.error("❌ Assinatura inválida recebida");
    return isValid;
  } catch (e) {
    console.error("❌ Erro ao verificar assinatura:", e.message);
    return false;
  }
}

// ==========================
// ✅ Processar Comandos
// ==========================
async function handleCommand(interaction) {
  const commandName = interaction.data.name;
  const sub = interaction.data.options?.[0]?.name;

  console.log(`🔧 Comando recebido: /${commandName} ${sub}`);

  const handler = commands[commandName]?.[sub];
  if (!handler) {
    console.error(`❌ Subcomando não encontrado: ${commandName} ${sub}`);
    return { type: 4, data: { content: "❌ Comando não encontrado", flags: 64 } };
  }

  // Envia defer imediato (Discord exige resposta em até 3s)
  await fetch(`https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: 5 })
  });

  // Cria objeto interaction compatível com os handlers
  const fakeInteraction = {
    options: {
      getString: (name) => {
        const opt = interaction.data.options?.[0]?.options?.find(o => o.name === name);
        return opt?.value;
      }
    },
    reply: async (data) => {
      const url = `https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}/messages/@original`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) console.error(`❌ Erro ao responder: ${res.status}`);
    },
    followUp: async (data) => {
      const url = `https://discord.com/api/v10/webhooks/${APP_ID}/${interaction.token}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) console.error(`❌ Erro no followUp: ${res.status}`);
    }
  };

  try {
    await handler.execute(fakeInteraction);
  } catch (err) {
    console.error("❌ Erro executando comando:", err);
    await fakeInteraction.reply({ content: "❌ Erro interno ao executar comando.", flags: 64 });
  }
}

// ==========================
// ✅ Servidor HTTP
// ==========================
const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      status: "ONLINE",
      commands: Object.keys(commands.miscrits),
      time: new Date().toISOString()
    }));
  }

  if (req.method === "POST" && req.url === "/interactions") {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", async () => {
      if (!verifyDiscordRequest(req, body)) {
        res.writeHead(401);
        return res.end("invalid request signature");
      }

      const interaction = JSON.parse(body);

      // Ping do Discord
      if (interaction.type === 1) {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ type: 1 }));
      }

      // Slash command
      if (interaction.type === 2) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ type: 5 })); // defer imediatamente
        return handleCommand(interaction);
      }

      res.writeHead(200);
      res.end("ok");
    });
    return;
  }

  res.writeHead(200);
  res.end("Miscritbot ativo!");
});

// ==========================
// ✅ WebSocket status
// ==========================
const WebSocket = require("ws");
let ws, heartbeat;

function connectGateway() {
  ws = new WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");

  ws.on("open", () => {
    console.log("🎉 Conectado ao Gateway Discord");
    ws.send(JSON.stringify({
      op: 2,
      d: {
        token: TOKEN,
        intents: 1,
        properties: { $os: "linux", $browser: "miscritbot", $device: "miscritbot" }
      }
    }));
  });

  ws.on("message", (data) => {
    const msg = JSON.parse(data);
    if (msg.op === 10) {
      heartbeat = setInterval(() => ws.send(JSON.stringify({ op: 1, d: null })), msg.d.heartbeat_interval);
    }
    if (msg.t === "READY") console.log(`🤖 Logado como ${msg.d.user.username}`);
  });

  ws.on("close", () => {
    console.log("🔌 Gateway fechado. Tentando reconectar...");
    if (heartbeat) clearInterval(heartbeat);
    setTimeout(connectGateway, 10000);
  });

  ws.on("error", (err) => console.error("🚨 Gateway error:", err.message));
}

// ==========================
// ✅ Inicialização
// ==========================
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ HTTP escutando na porta ${PORT}`);
  connectGateway();
});
