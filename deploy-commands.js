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

    console.log("🧹 CLEARING ALL COMMANDS...");
    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
    
    console.log("✅ All commands cleared, waiting 2 seconds...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    const mainCommand = new SlashCommandBuilder()
      .setName("miscrits")
      .setDescription("Comandos para informações sobre Miscrits");

    // Vamos usar nomes que forcem a ordem alfabética correta
    console.log("📝 Adding commands with alphabetical order...");

    // 1. info (vem primeiro alfabeticamente)
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

    // 2. moves-and-evos (MUDOU: wiki-moves → moves-and-evos - vem depois de 'info')
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

    // 3. relics (vem depois de 'moves-and-evos')
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

    // 4. spawn-days (vem depois de 'relics')  
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

    // 5. tierlist (vem por último)
    mainCommand.addSubcommand(subcommand =>
      subcommand
        .setName("tierlist")
        .setDescription("Show the Miscrits PvP tier list")
    );

    console.log("🔄 Registering commands with Discord...");
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { 
      body: [mainCommand.toJSON()] 
    });

    console.log("✅ Commands deployed successfully!");
    console.log("📋 Alphabetical order:");
    console.log("   1. /miscrits info");
    console.log("   2. /miscrits moves-and-evos");
    console.log("   3. /miscrits relics");
    console.log("   4. /miscrits spawn-days");
    console.log("   5. /miscrits tierlist");
    
    console.log("🕒 Waiting for Discord cache to update...");
  } catch (err) {
    console.error("❌ Error deploying commands:", err);
  }
})();