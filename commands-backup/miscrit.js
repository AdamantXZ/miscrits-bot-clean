const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const miscritsData = require("../data/miscrits.json");

// Se o arquivo tiver a chave "miscrits", acessa o array interno
const miscrits = Array.isArray(miscritsData.miscrits)
  ? miscritsData.miscrits
  : miscritsData;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("miscrit")
    .setDescription("Shows information about a specific Miscrit")
    .addStringOption(option =>
      option
        .setName("nome")
        .setDescription("Name of the Miscrit")
        .setRequired(true)
        .setAutocomplete(true)
    ),

  // ---------- Autocomplete: apenas começa com (startsWith) ----------
  async autocomplete(interaction) {
    try {
      const focusedRaw = interaction.options.getFocused();
      const focusedValue = (focusedRaw || "").toString().trim().toLowerCase();

      if (!focusedValue) {
        const choices = miscrits
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(0, 25)
          .map(m => ({ name: m.name, value: m.name }));

        return await interaction.respond(choices);
      }

      const prefixMatches = miscrits.filter(m =>
        m.name && m.name.toLowerCase().startsWith(focusedValue)
      );

      const results = prefixMatches
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 25);

      const choices = results.map(m => ({ name: m.name, value: m.name }));
      await interaction.respond(choices);
    } catch (err) {
      console.error("Erro no autocomplete /miscrit:", err);
      try { await interaction.respond([]); } catch {}
    }
  },

  // ---------- Execução do comando ----------
  async execute(interaction) {
    try {
      const name = interaction.options.getString("nome").toLowerCase();
      const miscrit = miscrits.find(m => m.name && m.name.toLowerCase() === name);

      if (!miscrit) {
        return await interaction.reply({
          content: "❌ Miscrit not found!",
          ephemeral: true,
        });
      }

      // 🔹 Ícone de cor conforme a raridade
      let rarityDot = "⚪";
      switch ((miscrit.rarity || "").toLowerCase()) {
        case "rare": rarityDot = "🔵"; break;
        case "epic": rarityDot = "🟢"; break;
        case "exotic": rarityDot = "🟣"; break;
        case "legendary": rarityDot = "🟠"; break;
        case "common": rarityDot = "⚪"; break;
      }

      // 🔹 Cor principal do embed conforme a raridade
      const rarityColors = {
        common: 0xaaaaaa,
        rare: 0x2b6cb0,
        epic: 0x2ecc71,
        exotic: 0x9b59b6,
        legendary: 0xe67e22,
      };
      const embedColor = rarityColors[(miscrit.rarity || "").toLowerCase()] || 0x2b6cb0;

      // ---------- Embed principal ----------
      const embed1 = new EmbedBuilder()
        .setTitle(miscrit.name)
        .setImage(miscrit.image_url || null)
        .setColor(embedColor);

      // ---------- Descrição com emojis ----------
      let description = "";

      if (miscrit.pvp_desired_status)
        description += `⚔️ **PVP Desired Status:** ${miscrit.pvp_desired_status}\n`;

      if (miscrit.days)
        description += `📖 **Days:** ${miscrit.days}\n`;

      if (miscrit.type)
        description += `**Type:** ${miscrit.type}\n`;

      if (miscrit.rarity)
        description += `**Rarity:** ${rarityDot} ${miscrit.rarity}\n`;

      if (miscrit.location && miscrit.location.toLowerCase() === "shop") {
        description += `**Location:** 🛒 Shop`;
      } else {
        if (miscrit.region)
          description += `🌍 **Region:** ${miscrit.region}\n`;
        if (miscrit.spawn)
          description += `**Spawn:** ${miscrit.spawn}\n`;
      }

      // ---------- Segundo embed com texto e local ----------
      const embed2 = new EmbedBuilder()
        .setDescription(description)
        .setColor(embedColor);

      if (miscrit.location_url)
        embed2.setImage(miscrit.location_url);

      await interaction.reply({
        embeds: [embed1, embed2],
        ephemeral: true // 🔹 Apenas o usuário que pesquisou verá o resultado
      });
    } catch (error) {
      console.error("❌ Error in /miscrit command:", error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "❌ An error occurred while executing this command!",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "❌ An error occurred while executing this command!",
          ephemeral: true,
        });
      }
    }
  },
};
