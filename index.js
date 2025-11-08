// index.js — Miscrits Bot (Render WebSocket via Proxy)
// ----------------------------------------------------
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

// ✅ CLIENT DISCORD.JS COM WEBSOCKET VIA PROXY
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  ws: {
    version: 10,
    buildIdentifyShard: (id) => id,
    properties: { $os: "linux", $browser: "discord.js", $device: "discord.js" },
    // ⚙️ Gateway Proxy confiável para Render
    buildUrl: () => "wss://discord-proxy.fly.dev/?v=10&encoding=json"
  },
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
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));
  for (const file of files) {
    const cmd = require(path.join(commandsPath, file));
    if (cmd?.data?.name) client.commands.set(cmd.data.name, cmd);
    console.log(`✅ Comando carregado: ${cmd.data.name}`);
  }
  console.log(`📋 Total de comandos: ${client.commands.size}`);
} catch (e) {
  console.error("❌ Erro ao carregar comandos:", e);
}

// ✅ EVENTOS
client.once("ready", () => {
  console.log("=".repeat(50));
  console.log(`🎉 BOT ONLINE: ${client.user.tag}`);
  console.log(`📊 Servidores: ${client.guilds.cache.size}`);
  console.log("=".repeat(50));
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`❌ Erro em /${interaction.commandName}:`, err);
    try {
      if (interaction.replied || interaction.deferred)
        await interaction.followUp({ content: "❌ Erro ao executar comando!", ephemeral: true });
      else
        await interaction.reply({ content: "❌ Erro ao executar comando!", ephemeral: true });
    } catch {}
  }
});

// ✅ EVENTOS DE CONEXÃO
client.on("error", err => console.error("🚨 Discord.js error:", err.message));
client.on("warn", info => console.warn("⚠️ Discord warning:", info));
client.on("disconnect", () => console.log("🔌 Desconectado — tentando reconectar..."));
client.on("reconnecting", () => console.log("🔁 Reconectando..."));

// ✅ HEALTH CHECK HTTP
const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: client.isReady() ? "ONLINE" : "CONNECTING",
      bot: client.user?.tag || "Desconectado",
      guilds: client.guilds?.cache.size || 0,
      uptime: Math.floor(process.uptime()),
      memory: (process.memoryUsage().rss / 1024 / 1024).toFixed(1) + "MB",
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Miscrits Bot - Online\n");
  }
});
const PORT = process.env.PORT || 10000;
server.listen(PORT, "0.0.0.0", () => console.log(`🌐 HTTP ativo na porta ${PORT}`));

// ✅ LOGIN DISCORD
(async () => {
  try {
    console.log("🚀 Conectando ao Discord (via proxy)...");
    await client.login(TOKEN);
  } catch (err) {
    console.error("❌ Falha no login:", err);
    setTimeout(() => process.exit(1), 10000);
  }
})();

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
