const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("miscrit-relics")
    .setDescription("Shows Miscrit relics info link")
    .addSubcommand(subcommand =>
      subcommand
        .setName("link")
        .setDescription("Get the Notion page with relic information")
    ),

  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === "link") {
        await interaction.reply({
          content: "🔗 **Miscrit Relics Information:**\nhttps://bow-cilantro-a4b.notion.site/25f9812adbd0802a8047fdeb9f4de21a?v=25f9812adbd0811dbc6b000c011536df",
          ephemeral: true
        });
      }
    } catch (error) {
      console.error("❌ Erro no comando /miscrit-relics:", error);
      await interaction.reply({
        content: "❌ Ocorreu um erro ao executar esse comando!",
        ephemeral: true,
      });
    }
  },
};

