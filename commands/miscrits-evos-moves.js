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

      await interaction.respond(results);
    } catch (err) {
      console.error("Autocomplete error:", err);
      try {
        await interaction.respond([]);
      } catch {}
    }
  },

  async execute(interaction) {
    try {
      const name = interaction.options.getString("name").toLowerCase();
      const miscrit = miscrits.find((m) => m.name?.toLowerCase() === name);

      if (!miscrit) {
        return await interaction.reply({ content: "❌ Miscrit not found!", ephemeral: true });
      }

      let description = "";
      
      if (miscrit.wiki_page) {
        description += `**Wiki Page:**\n${miscrit.wiki_page}`;
      } else {
        description += `**Wiki Page:** No wiki data available`;
      }

      const embed = new EmbedBuilder()
        .setDescription(description)
        .setColor(0x2b6cb0);

      await interaction.reply({ 
        embeds: [embed], 
        ephemeral: true 
      });
    } catch (err) {
      console.error("Command execution error:", err);
      try {
        await interaction.reply({ content: "❌ Error executing command!", ephemeral: true });
      } catch {}
    }
  },
};