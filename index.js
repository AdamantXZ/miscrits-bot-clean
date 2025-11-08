// index.js — Miscrits Bot (Render + WebSocket Tradicional Estável)
// ---------------------------------------------------------------
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const http = require("http");
const { Client, GatewayIntentBits, Collection } = require("discord.js");

console.log("🔧 MISCRITS BOT – Iniciando (modo WebSocket Tradicional)");

// ✅ TOKEN
const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
  console.error("❌ BOT_TOKEN não encontrado. Configure no Render.");
  process.exit(1);
}

// ✅ CONTROLE DE LOGS (anti-spam)
const logCache = new Map();
function rateLog(key, msg, interval = 15000) {
  const now = Date.now();
  const last = logCache.get(key) || 0;
  if (now - last > interval) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
    logCache.set(key, now);
  }
}

// ✅ CLIENT CONFIGURAÇÃO COMPATÍVEL COM RENDER
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  ws: {
    version: 10,
    compress: false,
    large_threshold: 50,
    properties: {
      $os: "linux",
      $browser: "discord.js",
      $device: "discord.js"
    },
  },
  rest: { timeout: 30000, retries: 3, offset: 50 },
  presence: {
    status: "online",
    activities: [{ name: "/miscrits help", type: 0 }],
  },
});

// ✅ CARREGAR COMANDOS
client.commands = new Collection();
try {
  const commandsPath = path.join(__dirname, "commands");
  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if (command?.data?.name) {
      client.commands.set(command.data.name, command);
      console.log(`✅ Comando carregado: ${command.data.name}`);
    }
  }
  console.log(`📋 Total de comandos carregados: ${client.commands.size}`);
} catch (err) {
  console.error("❌ Erro ao carregar comandos:", err.message);
}

// ✅ EVENTO: READY
client.once("ready", () => {
  console.log("=".repeat(50));
  console.log(`🎉 BOT ONLINE: ${client.user.tag}`);
  console.log(`📊 Servidores: ${client.guilds.cache.size}`);
  console.log(`🕒 Iniciado em: ${new Date().toLocaleString()}`);
  console.log("=".repeat(50));
});

// ✅ EVENTO: INTERAÇÃO
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    rateLog("cmd", `⚡ Executando comando: /${interaction.commandName}`);
    await command.execute(interaction);
  } catch (err) {
    rateLog("cmd-err", `❌ Erro em /${interaction.commandName}: ${err.message}`);
    try {
      if (interaction.deferred || interaction.replied)
        await interaction.followUp({ content: "❌ Erro ao executar comando!", ephemeral: true });
      else
        await interaction.reply({ content: "❌ Erro ao executar comando!", ephemeral: true });
    } catch {}
  }
});

// ✅ EVENTOS DE WEBSOCKET
client.on("shardReady", id => rateLog("shard", `🔗 Shard ${id} conectado`));
client.on("shardDisconnect", (_, id) => rateLog("disc", `🔌 Shard ${id} desconectado`));
client.on("shardReconnecting", id => rateLog("rec", `🔁 Shard ${id} reconectando...`));
client.on("shardError", (err, id) => rateLog("err", `⚠️ Shard ${id} erro: ${err.message}`));

// ✅ SERVIDOR HTTP (Render)
const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    const status = client.isReady() ? "ONLINE" : "CONNECTING";
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status,
      bot: client.user?.tag || "Desconectado",
      guilds: client.guilds?.cache.size || 0,
      uptime: Math.floor(process.uptime()),
      memory: (process.memoryUsage().rss / 1024 / 1024).toFixed(1) + " MB",
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Miscrits Bot - Online\n");
  }
});
const PORT = process.env.PORT || 10000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 HTTP ativo na porta ${PORT} - /health`);
});

// ✅ RECONEXÃO AUTOMÁTICA SE O SOCKET FECHAR
async function loginWithRetry(retry = 0) {
  try {
    console.log("🚀 Conectando ao Discord...");
    await client.login(TOKEN);
  } catch (err) {
    console.error("❌ Falha no login:", err.message);
    const delay = Math.min(30000 * (retry + 1), 120000);
    console.log(`⏳ Tentando novamente em ${delay / 1000}s...`);
    setTimeout(() => loginWithRetry(retry + 1), delay);
  }
}
loginWithRetry();

// ✅ HEARTBEAT (mantém Render ativo)
setInterval(() => {
  http.get(`http://127.0.0.1:${PORT}/health`, () => {});
}, 5 * 60 * 1000);

// ✅ ENCERRAMENTO GRACIOSO
process.on("SIGTERM", () => {
  console.log("🛑 Encerrando...");
  client.destroy();
  server.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  console.log("🛑 Encerrando...");
  client.destroy();
  server.close(() => process.exit(0));
});
