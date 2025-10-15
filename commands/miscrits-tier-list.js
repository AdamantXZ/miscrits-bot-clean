// commands/miscrits-tier-list.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("miscrits-tier-list")
    .setDescription("Show the Miscrits PvP tier list"),

  async execute(interaction) {
    try {
      // Tenta enviar a imagem no embed
      const embed = new EmbedBuilder()
        .setTitle("Miscrits PvP Tier List")
        .setImage("https://i.imgur.com/Tg3IQP4.png")
        .setColor(0x2b6cb0)
        .setFooter({ text: "Se a imagem não carregar, clique no botão abaixo" });

      // Botão com link direto como fallback
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('🔗 Abrir Tier List')
            .setURL('https://i.imgur.com/Tg3IQP4.png')
            .setStyle(ButtonStyle.Link)
        );

      await interaction.reply({ 
        embeds: [embed],
        components: [row],
        ephemeral: true 
      });
    } catch (error) {
      // Fallback se der erro
      await interaction.reply({
        content: "📊 **Miscrits PvP Tier List:**\nhttps://i.imgur.com/Tg3IQP4.png",
        ephemeral: true
      });
    }
  },
};