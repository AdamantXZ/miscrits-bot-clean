// commands/miscrits-days.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const miscritsData = require("../data/miscrits.json");

const miscrits = Array.isArray(miscritsData.miscrits) ? miscritsData.miscrits : miscritsData;

// Função para formatar em 3 colunas
function formatThreeColumns(miscritsList) {
  const names = [];
  const regions = [];
  const pvpStatuses = [];
  
  miscritsList.forEach(m => {
    let emoji = "⚪";
    switch ((m.rarity || "").toLowerCase()) {
      case "rare": emoji = "🔵"; break;
      case "epic": emoji = "🟢"; break;
      case "exotic": emoji = "🟣"; break;
      case "legendary": emoji = "🟠"; break;
    }
    
    names.push(`${emoji} ${m.name}`);
    regions.push(m.region || "Unknown");
    pvpStatuses.push(m.pvp_desired_status || "-");
  });
  
  // Encontra o comprimento máximo de cada coluna para alinhar
  const maxNameLength = Math.max(...names.map(n => n.length));
  const maxRegionLength = Math.max(...regions.map(r => r.length));
  
  // Formata as linhas
  const lines = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i].padEnd(maxNameLength + 2);
    const region = regions[i].padEnd(maxRegionLength + 2);
    const pvp = pvpStatuses[i];
    lines.push(`${name}${region}${pvp}`);
  }
  
  return lines;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("miscrits-days")
    .setDescription("Show Miscrits spawn for a specific day"),

  async execute(interaction) {
    const day = interaction.options.getString("day");
    const filtered = miscrits.filter((m) => {
      const days = (m.days || "").toLowerCase();
      const rarity = (m.rarity || "").toLowerCase();
      const location = (m.location || "").toLowerCase();

      const appears = days.includes(day.toLowerCase()) || days.includes("everyday");
      const isRareOrEpic = rarity === "rare" || rarity === "epic";
      const excluded = rarity === "common" || rarity === "exotic" || rarity === "legendary" || location === "shop";

      return appears && isRareOrEpic && !excluded;
    });

    if (filtered.length === 0) {
      return await interaction.reply({ content: `❌ No Miscrits found for **${day}**.`, ephemeral: true });
    }

    const chunkSize = 20; // Menos itens por embed para caber as colunas
    const chunks = [];
    for (let i = 0; i < filtered.length; i += chunkSize) {
      chunks.push(filtered.slice(i, i + chunkSize));
    }

    const embedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      // ✅ FORMATA EM 3 COLUNAS
      const formattedLines = formatThreeColumns(chunks[i]);
      
      const note =
        i === chunks.length - 1
          ? `\n\n*Only* **🔵 Rare** and **🟢 Epic** are shown.\n*⚪ Common, 🟣 Exotic, 🟠 Legendary and 🛒 Shop Miscrits are available every day.*`
          : "";

      const embed = new EmbedBuilder()
        .setTitle(`📅 Miscrits Spawn on ${day} (${i + 1}/${chunks.length})`)
        .setDescription('```' + formattedLines.join('\n') + '```' + note)
        .setColor(0x2b6cb0);

      embedChunks.push(embed);
    }

    // ✅ ENVIA MÚLTIPLOS EMBEDS JUNTOS
    const maxEmbedsPerMessage = 10;
    for (let i = 0; i < embedChunks.length; i += maxEmbedsPerMessage) {
      const embedsBatch = embedChunks.slice(i, i + maxEmbedsPerMessage);
      
      if (i === 0) {
        await interaction.reply({ embeds: embedsBatch, ephemeral: true });
      } else {
        await interaction.followUp({ embeds: embedsBatch, ephemeral: true });
      }
    }
  },
};