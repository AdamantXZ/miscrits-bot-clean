// commands/miscrits-evos-moves.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const miscritsData = require("../data/miscrits.json");

const miscrits = Array.isArray(miscritsData.miscrits) ? miscritsData.miscrits : miscritsData;

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("miscrits-evos-moves")
    .setDescription("Show evolution and moves information for a specific Miscrit")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Name of the Miscrit")
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    try {
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

      await interaction.respond(results);
    } catch (err) {
      console.error("Autocomplete error:", err);
      try {
        await interaction.respond([]);
      } catch {}
    }
  },

  async execute(interaction) {
    try {
      const name = interaction.options.getString("name").toLowerCase();
      const miscrit = miscrits.find((m) => m.name?.toLowerCase() === name);

      if (!miscrit) {
        return await interaction.reply({ content: "❌ Miscrit not found!", ephemeral: true });
      }

      let rarityDot = "⚪";
      switch ((miscrit.rarity || "").toLowerCase()) {
        case "rare":
          rarityDot = "🔵";
          break;
        case "epic":
          rarityDot = "🟢";
          break;
        case "exotic":
          rarityDot = "🟣";
          break;
        case "legendary":
          rarityDot = "🟠";
          break;
      }

      const rarityColors = {
        common: 0xaaaaaa,
        rare: 0x2b6cb0,
        epic: 0x2ecc71,
        exotic: 0x9b59b6,
        legendary: 0xe67e22,
      };

      const embedColor = rarityColors[(miscrit.rarity || "").toLowerCase()] || 0x2b6cb0;

      // Embed 1: Imagem do Miscrit
      const embed1 = new EmbedBuilder()
        .setTitle(`${miscrit.name} - Evolutions & Moves`)
        .setImage(miscrit.image_url || null)
        .setColor(embedColor);

      // Embed 2: Informações de Evolução e Moves
      let description = "";

      if (miscrit.evolutions) {
        description += `**Evolutions:** ${miscrit.evolutions}\n\n`;
      } else {
        description += `**Evolutions:** No evolution data available\n\n`;
      }

      if (miscrit.moves) {
        description += `**Moves:**\n${miscrit.moves}`;
      } else {
        description += `**Moves:** No moves data available`;
      }

      const embed2 = new EmbedBuilder()
        .setDescription(description)
        .setColor(embedColor);

      // Botões para Wiki e Relics
      const buttons = [];
      
      if (miscrit.wiki_page) {
        buttons.push(
          new ButtonBuilder()
            .setLabel('📖 Wiki Page')
            .setURL(miscrit.wiki_page)
            .setStyle(ButtonStyle.Link)
        );
      }
      
      if (miscrit.relics_site) {
        buttons.push(
          new ButtonBuilder()
            .setLabel('💎 Relics Site')
            .setURL(miscrit.relics_site)
            .setStyle(ButtonStyle.Link)
        );
      }

      const row = buttons.length > 0 ? new ActionRowBuilder().addComponents(...buttons) : null;

      await interaction.reply({ 
        embeds: [embed1, embed2], 
        components: row ? [row] : [],
        ephemeral: true 
      });
    } catch (err) {
      console.error("Command execution error:", err);
      try {
        await interaction.reply({ content: "❌ Error executing command!", ephemeral: true });
      } catch {}
    }
  },
};