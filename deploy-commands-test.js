// deploy-commands-test.js - ATUALIZADO COM NOVAS DESCRIÇÕES
require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const token = process.env.BOT_TOKEN;
const clientId = process.env.APPLICATION_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error("❌ Missing BOT_TOKEN, APPLICATION_ID or GUILD_ID in .env");
  process.exit(1);
}

(async () => {
  try {
    console.log("🚀 Registering TEST commands with /test...");

    const rest = new REST({ version: "10" }).setToken(token);

    // ===========================================
    // 🎯 Main command: /test
    // ===========================================
    const testCommand = new SlashCommandBuilder()
      .setName("test")
      .setDescription("MiscritBot test commands");

    // 📘 Subcommand: /test info
    testCommand.addSubcommand(sub =>
      sub
        .setName("info")
        .setDescription("Shows information about the location, rating and more about a specific Miscrit")
        .addStringOption(opt =>
          opt
            .setName("name")
            .setDescription("Name of the Miscrit")
            .setRequired(true)
            .setAutocomplete(true)
        )
    );

    // 📗 Subcommand: /test moves-and-evos
    testCommand.addSubcommand(sub =>
      sub
        .setName("moves-and-evos")
        .setDescription("Shows moves and evolutions for a specific Miscrit")  // ← DESCRIÇÃO ATUALIZADA
        .addStringOption(opt =>
          opt
            .setName("name")
            .setDescription("Name of the Miscrit")
            .setRequired(true)
            .setAutocomplete(true)
        )
    );

    // 📙 Subcommand: /test relics
    testCommand.addSubcommand(sub =>
      sub
        .setName("relics")
        .setDescription("Shows recommended relics for a specific Miscrit")  // ← DESCRIÇÃO ATUALIZADA
        .addStringOption(opt =>
          opt
            .setName("name")
            .setDescription("Name of the Miscrit")
            .setRequired(true)
            .setAutocomplete(true)
        )
    );

    // 📒 Subcommand: /test spawn-days
    testCommand.addSubcommand(sub =>
      sub
        .setName("spawn-days")
        .setDescription("Shows Miscrits that spawn on a specific day")
        .addStringOption(opt =>
          opt
            .setName("day")
            .setDescription("Day of the week")
            .setRequired(true)
            .addChoices(
              { name: "Monday", value: "Monday" },
              { name: "Tuesday", value: "Tuesday" },
              { name: "Wednesday", value: "Wednesday" },
              { name: "Thursday", value: "Thursday" },
              { name: "Friday", value: "Friday" },
              { name: "Saturday", value: "Saturday" },
              { name: "Sunday", value: "Sunday" }
            )
        )
    );

    // 📕 Subcommand: /test tierlist
    testCommand.addSubcommand(sub =>
      sub
        .setName("tierlist")
        .setDescription("Shows the Miscrits PvP tier list")
    );

    // ===========================================
    // 🚀 Register command in specific guild
    // ===========================================
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: [testCommand.toJSON()],
    });

    console.log("✅ TEST commands registered successfully!");
    console.log("📋 Available in specific server:");
    console.log("   /test info [name] - Shows information about the location, rating and more");
    console.log("   /test moves-and-evos [name] - Shows moves and evolutions for a specific Miscrit");
    console.log("   /test relics [name] - Shows recommended relics for a specific Miscrit");
    console.log("   /test spawn-days [day]");
    console.log("   /test tierlist");
    console.log("");
    console.log("📍 Commands available ONLY in server:", guildId);
  } catch (err) {
    console.error("❌ Error registering test commands:", err);
  }
})();