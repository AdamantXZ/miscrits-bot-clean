require("dotenv").config();
const { REST, Routes } = require("discord.js");

const token = process.env.BOT_TOKEN;
const applicationId = process.env.APPLICATION_ID;

if (!token || !applicationId) {
  console.error("Missing BOT_TOKEN or APPLICATION_ID in .env");
  process.exit(1);
}

(async () => {
  try {
    console.log("🧹 CLEARING GLOBAL COMMANDS...");

    const rest = new REST({ version: "10" }).setToken(token);

    // Limpar comandos globais
    await rest.put(Routes.applicationCommands(applicationId), { body: [] });
    console.log("✅ Global commands cleared successfully!");

  } catch (err) {
    console.error("❌ Error:", err);
  }
})();
