// deploy-commands.js
require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const token = process.env.BOT_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error("Missing BOT_TOKEN or CLIENT_ID in env");
  process.exit(1);
}

(async () => {
  try {
    console.log("🚀 Deploying global /miscrits command (with subcommands)...");

    const rest = new REST({ version: "10" }).setToken(token);

    const miscrits = new SlashCommandBuilder()
      .setName("miscrits")
      .setDescription("Miscrits commands (info, relics, days, tierlist, moves-and-evos)");

    miscrits.addSubcommand(sub =>
      sub
        .setName("info")
        .setDescription("Show information about a specific Miscrit")
        .addStringOption(opt =>
          opt.setName("name")
             .setDescription("Name of the Miscrit")
             .setRequired(true)
             .setAutocomplete(true)
        )
    );

    miscrits.addSubcommand(sub =>
      sub
        .setName("moves-and-evos")
        .setDescription("Show wiki page for a specific Miscrit")
        .addStringOption(opt =>
          opt.setName("name")
             .setDescription("Name of the Miscrit")
             .setRequired(true)
             .setAutocomplete(true)
        )
    );

    miscrits.addSubcommand(sub =>
      sub
        .setName("relics")
        .setDescription("Show relics build for a specific Miscrit")
        .addStringOption(opt =>
          opt.setName("name")
             .setDescription("Name of the Miscrit")
             .setRequired(true)
             .setAutocomplete(true)
        )
    );

    miscrits.addSubcommand(sub =>
      sub
        .setName("spawn-days")
        .setDescription("Show Miscrits spawn for a specific day")
        .addStringOption(opt =>
          opt.setName("day")
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

    miscrits.addSubcommand(sub =>
      sub
        .setName("tierlist")
        .setDescription("Show the Miscrits PvP tier list")
    );

    const commands = [miscrits.toJSON()];

    console.log(`📋 Registering ${commands.length} global command(s) ...`);
    await rest.put(Routes.applicationCommands(clientId), { body: commands });

    console.log("✅ Global commands registered. Note: global commands can take up to 1 hour to propagate.");
    console.log("✅ You can speed-test using the /miscrits-test (guild) deploy then switch to global once validated.");
  } catch (err) {
    console.error("❌ Deploy error:", err);
  }
})();