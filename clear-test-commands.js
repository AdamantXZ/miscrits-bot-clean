// clear-test-commands.js - Limpa APENAS comandos de teste
require("dotenv").config();
const { REST, Routes } = require("discord.js");

const token = process.env.BOT_TOKEN;
const clientId = process.env.APPLICATION_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error("Missing BOT_TOKEN, APPLICATION_ID or GUILD_ID in .env");
  process.exit(1);
}

(async () => {
  try {
    console.log("🧹 CLEARING ONLY TEST COMMANDS...");

    const rest = new REST({ version: "10" }).setToken(token);

    // Limpa APENAS comandos do servidor de TESTE
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
    console.log("✅ TEST commands cleared from guild:", guildId);
    
    console.log("🎯 Only TEST commands removed!");
    console.log("🕒 Wait 1 minute for Discord cache to clear...");
    
  } catch (err) {
    console.error("❌ Error:", err);
  }
})();