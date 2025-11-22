// commands/miscrits-tier-list.js - CORRIGIDO
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("miscrits-tier-list")
    .setDescription("Shows the Miscrits PvP tier list"),

  async execute(interaction) {
    try {
      console.log("✅ Executando comando tierlist...");
      
      const embed = new EmbedBuilder()
        .setTitle("Miscrits PvP Tier List (Updated until v1.18.0)")
        .setImage("https://i.imgur.com/9jWcgoI.png")
        .setColor(0x2b6cb0);

      // ✅ CORREÇÃO: ephemeral: true em vez de flags: 64
      await interaction.reply({ 
        embeds: [embed], 
        ephemeral: true 
      });
      console.log("✅ Resposta tierlist enviada com sucesso!");
      
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