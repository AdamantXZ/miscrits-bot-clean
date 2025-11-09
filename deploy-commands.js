require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error("Missing BOT_TOKEN or CLIENT_ID in .env");
  process.exit(1);
}

(async () => {
  try {
    console.log("🚀 Deploying commands for ALL servers...");

    const rest = new REST({ version: "10" }).setToken(token);

    const mainCommand = new SlashCommandBuilder()
      .setName("miscrits")
      .setDescription("Comandos para informações sobre Miscrits");

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

    mainCommand.addSubcommand(subcommand =>
      subcommand
        .setName("moves-and-evos")
        .setDescription("Show wiki page for a specific Miscrit")
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
        .setDescription("Show relics build for a specific Miscrit")
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

    mainCommand.addSubcommand(subcommand =>
      subcommand
        .setName("tierlist")
        .setDescription("Show the Miscrits PvP tier list")
    );

    console.log("🔄 Registering commands GLOBALLY...");
    await rest.put(Routes.applicationCommands(clientId), { 
      body: [mainCommand.toJSON()] 
    });

    console.log("✅ Commands deployed successfully!");
    console.log("📋 Available in ALL servers:");
    console.log("   /miscrits info");
    console.log("   /miscrits moves-and-evos");
    console.log("   /miscrits relics");
    console.log("   /miscrits spawn-days");
    console.log("   /miscrits tierlist");
    
  } catch (err) {
    console.error("❌ Error:", err);
  }
})();