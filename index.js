// index.js - Miscrits Bot (versão refinada e estável para Render)
// ---------------------------------------------------------------
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const http = require("http");
const { Client, GatewayIntentBits, Collection } = require("discord.js");

console.log("🔧 MISCRITS BOT - Inicializando...");

// ✅ TOKEN
const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
  console.error("❌ BOT_TOKEN não encontrado. Configure no Render.");
  process.exit(1);
}

// ✅ LOG CONTROLADO (anti-spam)
const logCache = new Map();
function rateLog(key, message, interval = 15000) {
  const now = Date.now();
  const last = logCache.get(key) || 0;
  if (now - last > interval) {
    console.log(`[${new Date().toISOString()}] ${message}`);
    logCache.set(key, now);
  }
}

// ✅ CLIENT DISCORD.JS
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  ws: { large_threshold: 50, compress: false },
  rest: { timeout: 30000, retries: 2, offset: 50 },
  presence: {
    status: "online",
    activities: [{ name: "/miscrits help", type: 0 }]
  }
});

// ✅ MAPA DE COMANDOS
const commandMap = {
  info: "miscrits-info",
  "moves-and-evos": "miscrits-evos-moves",
  relics: "miscrits-relics",
  "spawn-days": "miscrits-days",
  tierlist: "miscrits-tier-list"
};

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
  console.log(`📋 Total de comandos: ${client.commands.size}`);
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
  // Autocomplete
  if (interaction.isAutocomplete()) {
    const subcommand = interaction.options.getSubcommand(false);
    const target = commandMap[subcommand];
    const cmd = client.commands.get(target);
    if (cmd?.autocomplete) {
      try {
        await cmd.autocomplete(interaction);
      } catch (err) {
        rateLog("auto-error", `❌ Erro autocomplete: ${err.message}`);
      }
    }
    return;
  }

  // Slash command
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "miscrits") return;

  const subcommand = interaction.options.getSubcommand(false);
  const target = commandMap[subcommand];
  const command = client.commands.get(target);

  if (!command) {
    return interaction.reply({ content: "❌ Subcomando não encontrado!", ephemeral: true });
  }

  try {
    rateLog("cmd", `⚡ /miscrits ${subcommand}`);
    await command.execute(interaction);
  } catch (err) {
    rateLog("cmd-error", `❌ Erro em /miscrits ${subcommand}: ${err.message}`);
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: "❌ Erro ao executar comando!", ephemeral: true });
      } else {
        await interaction.reply({ content: "❌ Erro ao executar comando!", ephemeral: true });
      }
    } catch {}
  }
});

// ✅ EVENTOS DE CONEXÃO
client.on("error", (err) => rateLog("client-error", `🚨 Erro Discord: ${err.message}`));
client.on("warn", (info) => rateLog("warn", `⚠️ Aviso: ${info}`));
client.on("reconnecting", () => rateLog("reconnect", "🔁 Reconectando..."));
client.on("disconnect", (e) => rateLog("disconnect", `🔌 Desconectado: ${e?.code || "?"}`));

// ✅ HEALTH CHECK HTTP
const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    const status = client.isReady() ? "ONLINE" : "CONNECTING";
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status,
      bot: client.user?.tag || "Desconectado",
      guilds: client.guilds?.cache.size || 0,
      uptime: Math.floor(process.uptime()),
      memoryMB: (process.memoryUsage().rss / 1024 / 1024).toFixed(1),
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Miscrits Bot - Online\n");
  }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 HTTP ativo em porta ${PORT} - /health`);
});

// ✅ HEARTBEAT SILENCIOSO
setInterval(() => {
  http.get(`http://127.0.0.1:${PORT}/health`, () => {}).on("error", () => {});
}, 5 * 60 * 1000);

// ✅ LOGIN + RETRY
async function connectBot(retry = 0) {
  try {
    await client.login(TOKEN);
  } catch (err) {
    const delay = Math.min(30000 * (retry + 1), 180000);
    rateLog("login-fail", `❌ Login falhou: ${err.message}. Retentando em ${delay / 1000}s`);
    setTimeout(() => connectBot(retry + 1), delay);
  }
}
connectBot();

// ✅ ENCERRAMENTO LIMPO
function shutdown() {
  console.log("🛑 Encerrando...");
  client.destroy();
  server.close(() => process.exit(0));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// ✅ ERROS GLOBAIS
process.on("unhandledRejection", (r) => rateLog("unhandled", `🚨 Promise rejeitada: ${r}`));
process.on("uncaughtException", (e) => {
  rateLog("uncaught", `💥 Erro fatal: ${e.message}`);
  setTimeout(() => process.exit(1), 2000);
});