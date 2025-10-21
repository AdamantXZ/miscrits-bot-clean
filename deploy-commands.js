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

    // day spawn (SUBCOMMAND GROUP - IGUAL AO RELICS)
    mainCommand.addSubcommandGroup(group =>
      group
        .setName("day")
        .setDescription("Day spawn commands")
        .addSubcommand(subcommand =>
          subcommand
            .setName("spawn")
            .setDescription("Show Miscrits spawn for a specific day")
            .addStringOption(option =>
              option
                .setName("weekday")
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

    // relics link
    mainCommand.addSubcommandGroup(group =>
      group
        .setName("relics")
        .setDescription("Relics commands")
        .addSubcommand(subcommand =>
          subcommand
            .setName("link")
            .setDescription("Show link to Miscrits Relics information")
        )
    );

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { 
      body: [mainCommand.toJSON()] 
    });

    console.log("✅ Commands deployed successfully!");
    console.log("📋 Available commands:");
    console.log("   /miscrits info");
    console.log("   /miscrits day spawn"); 
    console.log("   /miscrits tier list");
    console.log("   /miscrits relics link");
  } catch (err) {
    console.error("❌ Error deploying commands:", err);
  }
})();