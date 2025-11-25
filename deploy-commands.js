// deploy-commands.js - ATUALIZADO COM NOVAS DESCRIÇÕES
require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const token = process.env.BOT_TOKEN;
const clientId = process.env.APPLICATION_ID;

if (!token || !clientId) {
  console.error("❌ Missing BOT_TOKEN or APPLICATION_ID in .env");
  process.exit(1);
}

(async () => {
  try {
    console.log("🚀 Registering global commands...");

    const rest = new REST({ version: "10" }).setToken(token);

    // ===========================================
    // 🎯 Main command: /miscrits
    // ===========================================
    const miscritsCommand = new SlashCommandBuilder()
      .setName("miscrits")
      .setDescription("Miscrits related commands");

    // 📘 Subcommand: /miscrits info
    miscritsCommand.addSubcommand(sub =>
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

    // 📗 Subcommand: /miscrits moves-and-evos
    miscritsCommand.addSubcommand(sub =>
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

    // 📙 Subcommand: /miscrits relics
    miscritsCommand.addSubcommand(sub =>
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

    // 📒 Subcommand: /miscrits spawn-days
    miscritsCommand.addSubcommand(sub =>
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

    // 📕 Subcommand: /miscrits tierlist
    miscritsCommand.addSubcommand(sub =>
      sub
        .setName("tierlist")
        .setDescription("Shows the Miscrits PvP tier list")
    );

    // ===========================================
    // 🚀 Register global command
    // ===========================================
    await rest.put(Routes.applicationCommands(clientId), {
      body: [miscritsCommand.toJSON()],
    });

    console.log("✅ Global commands registered successfully!");
    console.log("📋 Available globally:");
    console.log("   /miscrits info [name] - Shows information about the location, rating and more");
    console.log("   /miscrits moves-and-evos [name] - Shows moves and evolutions for a specific Miscrit");
    console.log("   /miscrits relics [name] - Shows recommended relics for a specific Miscrit");
    console.log("   /miscrits spawn-days [day]");
    console.log("   /miscrits tierlist");
  } catch (err) {
    console.error("❌ Error registering commands:", err);
  }
})();