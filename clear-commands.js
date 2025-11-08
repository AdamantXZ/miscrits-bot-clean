require("dotenv").config();
const { REST, Routes } = require("discord.js");

const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error("Missing BOT_TOKEN or CLIENT_ID in .env");
  process.exit(1);
}

(async () => {
  try {
    console.log("🧹 CLEARING ALL COMMANDS...");

    const rest = new REST({ version: "10" }).setToken(token);

    // 1. Limpa comandos GLOBAIS
    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    console.log("✅ Global commands cleared");
    
    // 2. Limpa comandos do SEU SERVIDOR
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
      console.log("✅ Guild commands cleared");
    }
    
    console.log("🎯 ALL commands removed from everywhere!");
    console.log("🕒 Wait 1 minute for Discord cache to clear...");
    
  } catch (err) {
    console.error("❌ Error:", err);
  }
})();