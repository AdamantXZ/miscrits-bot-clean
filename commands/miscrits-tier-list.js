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
        .setTitle("Miscrits PvP Tier List (Updated until v1.20.0)")
        .setDescription(
          "This tier list does not indicate ALL viable crits, just the best CURRENT meta crits.\n" +
          "This does not mean crits not mentioned here are bad, just not as good.\n\n" +
          "There are well over 100 viable crits to use — by all means, experiment.\n\n" +
          "**Credits:** @SammyTW @frac wants to merry & pig josh"
  )
        .setImage("https://i.imgur.com/kCtcX4p.png")
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