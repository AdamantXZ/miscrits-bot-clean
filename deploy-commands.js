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

    // spawn days (SUBCOMMAND GROUP - NOME INVERTIDO)
    mainCommand.addSubcommandGroup(group =>
      group
        .setName("spawn") // AGORA É "spawn" NO LUGAR DE "days"
        .setDescription("Spawn commands")
        .addSubcommand(subcommand =>
          subcommand
            .setName("day") // AGORA É "day" NO LUGAR DE "spawn"
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
        )
    );

    // tier list
    mainCommand.addSubcommandGroup(group =>
      group
        .setName("tier")
        .setDescription("Tier list commands")
        .addSubcommand(subcommand =>
          subcommand
            .setName("list")
            .setDescription("Show the Miscrits PvP tier list")
        )
    );

    // REMOVIDO: relics link

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { 
      body: [mainCommand.toJSON()] 
    });

    console.log("✅ Commands deployed successfully!");
    console.log("📋 Available commands:");
    console.log("   /miscrits info");
    console.log("   /miscrits spawn day"); // AGORA É "spawn day"
    console.log("   /miscrits tier list");
    console.log("   (relics link removido)");
  } catch (err) {
    console.error("❌ Error deploying commands:", err);
  }
})();