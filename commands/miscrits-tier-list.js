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
        .setTitle("Miscrits PvP Tier List (Updated until v2.1.0)")
        .setDescription(
          "PSA. This does not mean crits that did not make the list are not good or usable.\n" +
          "This is based off the current meta and which crits are performing the best.\n\n" +         
          "**Credits: @frac pigs josh @add me in game chewyjosh @Charles do Bronx @fl∞ rugu @riftwalker "
  )
        .setImage("https://i.imgur.com/TZ5fRA2.png")
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