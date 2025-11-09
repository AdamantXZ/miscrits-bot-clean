// commands/miscrits-info.js - CORRIGIDO
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const miscritsData = require("../data/miscrits.json");

const miscrits = Array.isArray(miscritsData.miscrits) ? miscritsData.miscrits : miscritsData;

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("miscrits-info")
    .setDescription("Show information about a specific Miscrit")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Name of the Miscrit")
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    try {
      if (interaction.responded) return;
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

      if (!interaction.responded) {
        await interaction.respond(results);
      }
    } catch (err) {
      if (err.code === 10062 || err.code === 40060) return;
      console.error("Autocomplete error:", err);
    }
  },

  async execute(interaction) {
    try {
      console.log("✅ Executando comando info...");
      
      const name = interaction.options.getString("name").toLowerCase();
      const miscrit = miscrits.find((m) => m.name?.toLowerCase() === name);

      if (!miscrit) {
        // ✅ CORREÇÃO: Chamar reply() mesmo para erros
        return await interaction.reply({ content: "❌ Miscrit not found!", flags: 64 });
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

      const embed1 = new EmbedBuilder()
        .setTitle(miscrit.name)
        .setImage(miscrit.image_url || null)
        .setColor(embedColor);

      let description = "";

      // ✅ CORRIGIDO: Aspas adicionadas
      if (miscrit.pvp_desired_status)
        description += `⚔️ **PVP Desired Status:** ${miscrit.pvp_desired_status}\n`;

      // ✅ NOVA LINHA ADICIONADA
      if (miscrit.useless_pvp_status)
        description += `💤 **Useless PVP Status:** ${miscrit.useless_pvp_status}\n`;

      if (miscrit.days) description += `📅 **Days:** ${miscrit.days}\n`;

      if (miscrit.type) description += `**Type:** ${capitalize(miscrit.type)}\n`;

      if (miscrit.rarity)
        description += `**Rarity:** ${rarityDot} **${capitalize(miscrit.rarity)}**\n`;

      if (miscrit.location && miscrit.location.toLowerCase() === "shop") {
        description += `**Location:** 🏪 **Shop**\n`;
      } else {
        if (miscrit.region) description += `🌎 **Region:** ${miscrit.region}\n`;
        if (miscrit.spawn) description += `**Spawn:** ${miscrit.spawn}\n`;
      }

      const embed2 = new EmbedBuilder().setDescription(description).setColor(embedColor);
      if (miscrit.location_url) embed2.setImage(miscrit.location_url);

      // ✅ CORREÇÃO: Chamar interaction.reply() para enviar a resposta
      await interaction.reply({ embeds: [embed1, embed2], flags: 64 });
      console.log("✅ Resposta info enviada com sucesso!");
      
    } catch (err) {
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