const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("miscrit-tier-list")
    .setDescription("Shows the Miscrit PvP tier list"),

  async execute(interaction) {
    try {
      const embed = new EmbedBuilder()
        .setTitle("Miscrit PvP Tier List")
        .setImage("https://i.imgur.com/Tg3IQP4.png")
        .setColor(0x2b6cb0);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error("❌ Error in /miscrit-tier-list:", error);
      await interaction.reply({
        content: "❌ An error occurred while showing the tier list!",
        ephemeral: true,
      });
    }
  },
};
