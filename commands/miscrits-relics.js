// commands/miscrits-relics.js - CORRIGIDO
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const miscritsData = require("../data/miscrits.json");

const miscrits = Array.isArray(miscritsData.miscrits) ? miscritsData.miscrits : miscritsData;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("miscrits-relics")
    .setDescription("Shows relics build for a specific Miscrit")
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
      console.log("✅ Executando comando relics...");
      
      const name = interaction.options.getString("name").toLowerCase();
      const miscrit = miscrits.find((m) => m.name?.toLowerCase() === name);

      if (!miscrit) {
        // ✅ CORREÇÃO: ephemeral: true em vez de flags: 64
        return await interaction.reply({ 
          content: "❌ Miscrit not found!", 
          ephemeral: true 
        });
      }

      const embed1 = new EmbedBuilder()
        .setImage("https://i.imgur.com/80zldXd.png")
        .setColor(0x2b6cb0);

      let description = "";
      
      if (miscrit.relics_site) {
        description += `**${miscrit.name} Relics Build:**\n${miscrit.relics_site}`;
      } else {
        description += `**${miscrit.name} Relics Build:** No relics data available`;
      }

      const embed2 = new EmbedBuilder()
        .setDescription(description)
        .setColor(0x2b6cb0);

      // ✅ CORREÇÃO: ephemeral: true em vez de flags: 64
      await interaction.reply({ 
        embeds: [embed1, embed2], 
        ephemeral: true 
      });
      console.log("✅ Resposta relics enviada com sucesso!");
      
    } catch (err) {
      if (err.code === 10062) return;
      console.error("Command execution error:", err);
      try {
        await interaction.reply({ 
          content: "❌ Error executing command!", 
          ephemeral: true 
        });
      } catch (replyErr) {
        if (replyErr.code !== 10062) {
          console.error('Error sending error message:', replyErr.message);
        }
      }
    }
  },
};