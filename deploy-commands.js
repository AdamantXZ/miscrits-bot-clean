require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error("Missing BOT_TOKEN, CLIENT_ID, or GUILD_ID in .env");
  process.exit(1);
}

(async () => {
  try {
    console.log("🚀 Deploying commands...");

    const rest = new REST({ version: "10" }).setToken(token);

    console.log("🧹 Clearing old commands...");
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });

    const mainCommand = new SlashCommandBuilder()
      .setName("miscrits")
      .setDescription("Comandos para informações sobre Miscrits");

    // info
    mainCommand.addSubcommand(subcommand =>
      subcommand
        .setName("info")
        .setDescription("Show information about a specific Miscrit")
        .addStringOption(option =>
          option
            .setName("name")
            .setDescription("Name of the Miscrit")
            .setRequired(true)
            .setAutocomplete(true)
        )
    );

    // spawn-days (SUBCOMMAND SIMPLES - NOME ALTERADO)
    mainCommand.addSubcommand(subcommand =>
      subcommand
        .setName("spawn-days")
        .setDescription("Show Miscrits spawn for a specific day")
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

    // tierlist (SUBCOMMAND SIMPLES - NOME ALTERADO)
    mainCommand.addSubcommand(subcommand =>
      subcommand
        .setName("tierlist")
        .setDescription("Show the Miscrits PvP tier list")
    );

    // evos-moves (SUBCOMMAND SIMPLES - NOME ALTERADO - SEM &)
    mainCommand.addSubcommand(subcommand =>
      subcommand
        .setName("evos-moves")
        .setDescription("Show wiki page for a specific Miscrit")
        .addStringOption(option =>
          option
            .setName("name")
            .setDescription("Name of the Miscrit")
            .setRequired(true)
            .setAutocomplete(true)
        )
    );

    // relics (SUBCOMMAND SIMPLES - NOME ALTERADO)
    mainCommand.addSubcommand(subcommand =>
      subcommand
        .setName("relics")
        .setDescription("Show relics build for a specific Miscrit")
        .addStringOption(option =>
          option
            .setName("name")
            .setDescription("Name of the Miscrit")
            .setRequired(true)
            .setAutocomplete(true)
        )
    );

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { 
      body: [mainCommand.toJSON()] 
    });

    console.log("✅ Commands deployed successfully!");
    console.log("📋 Available commands:");
    console.log("   /miscrits info");
    console.log("   /miscrits spawn-days");
    console.log("   /miscrits tierlist");
    console.log("   /miscrits evos-moves");
    console.log("   /miscrits relics");
  } catch (err) {
    console.error("❌ Error deploying commands:", err);
  }
})();