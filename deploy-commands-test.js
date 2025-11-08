require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID; // SEU servidor

if (!token || !clientId || !guildId) {
  console.error("Missing BOT_TOKEN, CLIENT_ID, or GUILD_ID in .env");
  process.exit(1);
}

(async () => {
  try {
    console.log("🚀 Deploying TEST commands to YOUR server only...");

    const rest = new REST({ version: "10" }).setToken(token);

    const mainCommand = new SlashCommandBuilder()
      .setName("miscrits-test") // NOME DIFERENTE para teste
      .setDescription("TEST - Comandos para informações sobre Miscrits");

    mainCommand.addSubcommand(subcommand =>
      subcommand
        .setName("info")
        .setDescription("TEST - Show information about a specific Miscrit")
        .addStringOption(option =>
          option
            .setName("name")
            .setDescription("Name of the Miscrit")
            .setRequired(true)
            .setAutocomplete(true)
        )
    );

    mainCommand.addSubcommand(subcommand =>
      subcommand
        .setName("moves-and-evos")
        .setDescription("TEST - Show wiki page for a specific Miscrit")
        .addStringOption(option =>
          option
            .setName("name")
            .setDescription("Name of the Miscrit")
            .setRequired(true)
            .setAutocomplete(true)
        )
    );

    mainCommand.addSubcommand(subcommand =>
      subcommand
        .setName("relics")
        .setDescription("TEST - Show relics build for a specific Miscrit")
        .addStringOption(option =>
          option
            .setName("name")
            .setDescription("Name of the Miscrit")
            .setRequired(true)
            .setAutocomplete(true)
        )
    );

    mainCommand.addSubcommand(subcommand =>
      subcommand
        .setName("spawn-days")
        .setDescription("TEST - Show Miscrits spawn for a specific day")
        .addStringOption(option =>
          option
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

    mainCommand.addSubcommand(subcommand =>
      subcommand
        .setName("tierlist")
        .setDescription("TEST - Show the Miscrits PvP tier list")
    );

    console.log("🔄 Registering TEST commands in YOUR server...");
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { 
      body: [mainCommand.toJSON()] 
    });

    console.log("✅ TEST commands deployed successfully!");
    console.log("📋 Use /miscrits-test commands for testing");
    console.log("🔧 Test your data changes, then deploy globally");
    
  } catch (err) {
    console.error("❌ Error:", err);
  }
})();