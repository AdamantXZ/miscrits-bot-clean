// commands/miscrits-relics.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const miscritsData = require("../data/miscrits.json");

const miscrits = Array.isArray(miscritsData.miscrits) ? miscritsData.miscrits : miscritsData;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("miscrits-relics")
    .setDescription("Show relics build for a specific Miscrit")
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

      const embedColor = 0x2b6cb0;

      // Embed com apenas o link das relics
      let description = "";
      
      if (miscrit.relics_site) {
        description += `**Relics Build:**\n🔗 ${miscrit.relics_site}`;
      } else {
        description += `**Relics Build:** No relics data available`;
      }

      const embed = new EmbedBuilder()
        .setTitle(`${miscrit.name} - Relics Build`)
        .setDescription(description)
        .setColor(embedColor);

      // Botão para o site de relics
      const row = miscrit.relics_site ? new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('💎 Open Relics Build')
          .setURL(miscrit.relics_site)
          .setStyle(ButtonStyle.Link)
      ) : null;

      await interaction.reply({ 
        embeds: [embed], 
        components: row ? [row] : [],
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