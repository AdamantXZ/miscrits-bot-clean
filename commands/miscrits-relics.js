// commands/miscrits-relics.js
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("miscrits-relics")
    .setDescription("Show link to Miscrits Relics information"),

  async execute(interaction) {
    await interaction.reply({
      content:
        "🔗 **Miscrit Relics Information:**\nhttps://bow-cilantro-a4b.notion.site/25f9812adbd0802a8047fdeb9f4de21a?v=25f9812adbd0811dbc6b000c011536df",
      ephemeral: true,
    });
  },
};
