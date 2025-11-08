// index.js — Miscrits Bot (Render WebSocket compatível universal)
// ---------------------------------------------------------------
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const http = require("http");
const { Client, GatewayIntentBits, Collection } = require("discord.js");

console.log("🔧 MISCRITS BOT – Inicializando...");

// ✅ TOKEN
const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
  console.error("❌ BOT_TOKEN não encontrado!");
  process.exit(1);
}

// ✅ CLIENTE DISCORD.JS (CONFIG RENDER-FRIENDLY)
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  ws: { compress: false, large_threshold: 50 },
  rest: { timeout: 30000, retries: 3 },
  presence: {
    status: "online",
    activities: [{ name: "/miscrits help", type: 0 }],
  },
});

// ✅ CARREGAR COMANDOS
client.commands = new Collection();

try {
  const commandsPath = path.join(__dirname, "commands");
  const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"));

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
  console.error("❌ Erro ao carregar comandos:", err);
}

// ✅ EVENTO READY
client.once("ready", () => {
  console.log("=".repeat(50));
  console.log(`🎉 BOT ONLINE: ${client.user.tag}`);
  console.log(`📊 Servidores: ${client.guilds.cache.size}`);
  console.log("=".repeat(50));
});

// ✅ EVENTO DE INTERAÇÃO
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`❌ Erro em /${interaction.commandName}:`, err);
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          content: "❌ Erro ao executar comando!",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "❌ Erro ao executar comando!",
          ephemeral: true,
        });
      }
    } catch {}
  }
});

// ✅ EVENTOS DE CONEXÃO / WEBSOCKET
client.on("error", (err) => console.error("🚨 Erro Discord:", err.message));
client.on("warn", (info) => console.warn("⚠️ Aviso Discord:", info));
client.on("reconnecting", () => console.log("🔁 Reconectando..."));
client.on("disconnect", (e) => console.log(`🔌 Desconectado: ${e?.code || "?"}`));

// ✅ SERVIDOR HTTP PARA HEALTH CHECK
const server = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: client.isReady() ? "ONLINE" : "CONNECTING",
        bot: client.user?.tag || "Desconectado",
        guilds: client.guilds?.cache.size || 0,
        uptime: Math.floor(process.uptime()),
        memoryMB: (process.memoryUsage().rss / 1024 / 1024).toFixed(1),
        timestamp: new Date().toISOString(),
      })
    );
  } else {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Miscrits Bot – Online\n");
  }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 HTTP ativo na porta ${PORT}`);
});

// ✅ LOGIN AUTOMÁTICO COM RECONEXÃO
async function connect() {
  try {
    console.log("🚀 Conectando ao Discord...");
    await client.login(TOKEN);
  } catch (err) {
    console.error("❌ Falha no login:", err.message);
    console.log("⏳ Tentando novamente em 30s...");
    setTimeout(connect, 30000);
  }
}
connect();

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
