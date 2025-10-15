// commands/miscrits-days.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const miscritsData = require("../data/miscrits.json");

const miscrits = Array.isArray(miscritsData.miscrits) ? miscritsData.miscrits : miscritsData;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("miscrits-days")
    .setDescription("Show all Miscrits that appear on a specific day")
    .addStringOption((option) =>
      option
        .setName("day")
        .setDescription("Day of the week")
        .setRequired(true)
        .addChoices(
          { name: "Monday", value: "Monday" },
          { name: "Tuesday", value: "Tuesday" },
          { name: "Wednesday", value: "Wednesday" },
          { name: "Thursday", value: "Thursday" },
          { name: "Friday", value: "Friday" },
          { name: "Saturday", value: "Saturday" },
          { name: "Sunday", value: "Sunday" }
        )
    ),

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

    const chunkSize = 30;
    const chunks = [];
    for (let i = 0; i < filtered.length; i += chunkSize) {
      chunks.push(filtered.slice(i, i + chunkSize));
    }

    for (let i = 0; i < chunks.length; i++) {
      const lines = chunks[i].map((m) => {
        let emoji = "⚪";
        switch ((m.rarity || "").toLowerCase()) {
          case "rare": emoji = "🔵"; break;
          case "epic": emoji = "🟢"; break;
          case "exotic": emoji = "🟣"; break;
          case "legendary": emoji = "🟠"; break;
        }
        return `${emoji} **${m.name}** — ${m.region || "Unknown Region"}`;
      });

      const note =
        i === chunks.length - 1
          ? `\n\n*Only* **🔵 Rare** and **🟢 Epic** are shown.\n*⚪ Common, 🟣 Exotic, 🟠 Legendary and 🛒 Shop Miscrits are available every day.*`
          : "";

      const embed = new EmbedBuilder()
        .setTitle(`📅 Miscrits on ${day} (${i + 1}/${chunks.length})`)
        .setDescription(lines.join("\n") + note)
        .setColor(0x2b6cb0);

      if (i === 0) await interaction.reply({ embeds: [embed], ephemeral: true });
      else await interaction.followUp({ embeds: [embed], ephemeral: true });
    }
  },
};
