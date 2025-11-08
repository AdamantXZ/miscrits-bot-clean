// index.js - Miscrits Bot (Render Free Stable Version)
// ----------------------------------------------------
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const http = require("http");
const { Client, GatewayIntentBits, Collection } = require("discord.js");

console.log("🔧 MISCRITS BOT - Inicializando...");

// ✅ Token e validações básicas
const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
  console.error("❌ BOT_TOKEN não encontrado. Configure nas variáveis de ambiente do Render.");
  process.exit(1);
}

// ✅ Criação do cliente Discord
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  ws: { large_threshold: 50, compress: false },
  rest: { timeout: 30000, retries: 3, offset: 50 },
  presence: {
    status: "online",
    activities: [{ name: "/miscrits help", type: 0 }]
  }
});

// ✅ Anti-spam de log (para não causar 429)
const logCache = new Map();
function rateLog(key, message, interval = 15000) {
  const now = Date.now();
  if (!logCache.has(key) || now - logCache.get(key) > interval) {
    console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
    logCache.set(key, now);
  }
}

// ✅ Mapeamento dos subcomandos
const commandMap = {
  info: "miscrits-info",
  "moves-and-evos": "miscrits-evos-moves",
  relics: "miscrits-relics",
  "spawn-days": "miscrits-days",
  tierlist: "miscrits-tier-list"
};

// ✅ Carregar comandos
client.commands = new Collection();
try {
  const commandsPath = path.join(__dirname, "commands");
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

  for (const file of files) {
    const cmd = require(path.join(commandsPath, file));
    if (cmd?.data?.name) {
      client.commands.set(cmd.data.name, cmd);
      console.log(`✅ Comando carregado: ${cmd.data.name}`);
    }
  }

  console.log(`📋 Total de comandos carregados: ${client.commands.size}`);
} catch (err) {
  console.error("❌ Erro ao carregar comandos:", err.message);
}

// ✅ Evento: bot pronto
client.once("ready", () => {
  console.log("=".repeat(50));
  console.log(`🎉 BOT ONLINE: ${client.user.tag}`);
  console.log(`📊 Conectado em ${client.guilds.cache.size} servidor(es)`);
  console.log(`🕒 Iniciado: ${new Date().toLocaleString()}`);
  console.log("=".repeat(50));
});

// ✅ Evento: interação
client.on("interactionCreate", async (interaction) => {
  try {
    // Autocomplete
    if (interaction.isAutocomplete()) {
      const sub = interaction.options.getSubcommand(false);
      const cmd = client.commands.get(commandMap[sub]);
      if (cmd?.autocomplete) await cmd.autocomplete(interaction);
      return;
    }

    // Slash command
    if (!interaction.isChatInputCommand()) return;

    const sub = interaction.options.getSubcommand(false);
    const cmd = client.commands.get(commandMap[sub]);

    if (!cmd) {
      return interaction.reply({ content: "❌ Comando não encontrado!", ephemeral: true });
    }

    rateLog("cmd", `⚡ /miscrits ${sub}`);
    await cmd.execute(interaction);

  } catch (err) {
    rateLog("cmd-error", `❌ Erro: ${err.message}`);
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: "❌ Erro ao executar comando!", ephemeral: true });
      } else {
        await interaction.reply({ content: "❌ Erro ao executar comando!", ephemeral: true });
      }
    } catch {}
  }
});

// ✅ Eventos de conexão
client.on("error", (err) => rateLog("client-error", `🚨 Discord error: ${err.message}`));
client.on("warn", (info) => rateLog("warn", `⚠️ Aviso: ${info}`));
client.on("reconnecting", () => rateLog("reconnect", "🔁 Reconectando..."));
client.on("disconnect", (e) => rateLog("disconnect", `🔌 Desconectado (${e?.code || "?"})`));

// ✅ Health check HTTP
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
  console.log(`🌐 HTTP ativo na porta ${PORT} - /health`);
});

// ✅ Keep-alive interno (Render Free)
setInterval(() => {
  http.get(`http://127.0.0.1:${PORT}/health`, () => {}).on("error", () => {});
}, 5 * 60 * 1000);

// ✅ Conexão automática com retry
async function connectBot(retry = 0) {
  try {
    console.log("🚀 Conectando ao Discord...");
    await client.login(TOKEN);
    console.log("✅ Login iniciado com sucesso");
  } catch (err) {
    const delay = Math.min(30000 * (retry + 1), 180000);
    rateLog("login-fail", `❌ Falha ao conectar: ${err.message} — Retentando em ${delay / 1000}s`);
    setTimeout(() => connectBot(retry + 1), delay);
  }
}
connectBot();

// ✅ Encerramento limpo
function shutdown() {
  console.log("🛑 Encerrando...");
  client.destroy();
  server.close(() => process.exit(0));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// ✅ Tratamento global de erros
process.on("unhandledRejection", (r) => rateLog("unhandled", `🚨 Promise rejeitada: ${r}`));
process.on("uncaughtException", (e) => {
  rateLog("uncaught", `💥 Erro fatal: ${e.message}`);
  setTimeout(() => process.exit(1), 2000);
});
