// commands/miscrits-tier-list.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("miscrits-tier-list")
    .setDescription("Show the Miscrits PvP tier list"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("Miscrits PvP Tier List (Updated until v1.15)")
      .setImage("https://i.imgur.com/Tg3IQP4.png")
      .setColor(0x2b6cb0);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};