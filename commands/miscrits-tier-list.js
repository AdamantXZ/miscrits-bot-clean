// commands/miscrits-tier-list.js - CORRIGIDO
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const miscritsData = require("../data/miscrits.json");

const miscrits = Array.isArray(miscritsData.miscrits) ? miscritsData.miscrits : miscritsData;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("miscrits-tier-list")
    .setDescription("Show the Miscrits PvP tier list"),

  async execute(interaction) {
    try {
      console.log("✅ Executando comando tierlist...");
      
      const embed = new EmbedBuilder()
        .setTitle("Miscrits PvP Tier List (Updated until v1.16.0)")
        .setImage("https://i.imgur.com/8xdq1SN.png")
        .setColor(0x2b6cb0);

      // ✅ CORREÇÃO: Chamar interaction.reply() para enviar a resposta
      await interaction.reply({ embeds: [embed], flags: 64 });
      console.log("✅ Resposta tierlist enviada com sucesso!");
      
    } catch (err) {
      // ✅ IGNORA ERROS DE INTERAÇÃO EXPIRADA
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