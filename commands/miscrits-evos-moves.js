// commands/miscrits-evos-moves.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const miscritsData = require("../data/miscrits.json");

const miscrits = Array.isArray(miscritsData.miscrits) ? miscritsData.miscrits : miscritsData;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("miscrits-evos-moves")
    .setDescription("Show wiki page for a specific Miscrit")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Name of the Miscrit")
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    try {
      if (interaction.responded) return;
      
      const focused = (interaction.options.getFocused() || "").trim().toLowerCase();
      let results;

      if (!focused) {
        results = miscrits
          .slice()
          .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
          .slice(0, 25)
          .map((m) => ({ name: m.name, value: m.name }));
      } else {
        results = miscrits
          .filter((m) => m.name && m.name.toLowerCase().startsWith(focused))
          .slice(0, 25)
          .map((m) => ({ name: m.name, value: m.name }));
      }

      if (!interaction.responded) {
        await interaction.respond(results);
      }
    } catch (err) {
      if (err.code === 10062 || err.code === 40060) return;
      console.error("Autocomplete error:", err);
    }
  },

  async execute(interaction) {
    try {
      const name = interaction.options.getString("name").toLowerCase();
      const miscrit = miscrits.find((m) => m.name?.toLowerCase() === name);

      if (!miscrit) {
        return await interaction.reply({ content: "❌ Miscrit not found!", flags: 64 });
      }

      const embed1 = new EmbedBuilder()
        .setImage("https://i.imgur.com/dMyh4pu.png")
        .setColor(0x2b6cb0);

      let description = "";
      
      if (miscrit.wiki_page) {
        description += `**${miscrit.name} Wiki Page:**\n${miscrit.wiki_page}`;
      } else {
        description += `**${miscrit.name} Wiki Page:** No wiki data available`;
      }

      const embed2 = new EmbedBuilder()
        .setDescription(description)
        .setColor(0x2b6cb0);

      await interaction.reply({ 
        embeds: [embed1, embed2], 
        flags: 64 
      });
    } catch (err) {
      if (err.code === 10062) return;
      console.error("Command execution error:", err);
      try {
        await interaction.reply({ content: "❌ Error executing command!", flags: 64 });
      } catch (replyErr) {
        if (replyErr.code !== 10062) {
          console.error('Error sending error message:', replyErr.message);
        }
      }
    }
  },
};