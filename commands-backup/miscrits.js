const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const miscritsData = require("../data/miscrits.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("miscrits")
    .setDescription("Shows all Miscrits that appear on a specific day of the week")
    .addStringOption(option =>
      option
        .setName("day")
        .setDescription("Day of the week (e.g., Monday, Tuesday, etc.)")
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
    try {
      const day = interaction.options.getString("day");
      const miscrits = miscritsData.miscrits || [];

      const filtered = miscrits.filter(m => {
        const days = m.days?.toLowerCase() || "";
        const rarity = m.rarity?.toLowerCase() || "";
        const location = m.location?.toLowerCase() || "";

        const appearsToday =
          days.includes(day.toLowerCase()) || days.includes("everyday");

        const isRareOrEpic = rarity === "rare" || rarity === "epic";
        const isExcluded =
          rarity === "common" ||
          rarity === "exotic" ||
          rarity === "legendary" ||
          location === "shop";

        return appearsToday && isRareOrEpic && !isExcluded;
      });

      if (filtered.length === 0) {
        return await interaction.reply({
          content: `❌ No Miscrits found for **${day}**.`,
          ephemeral: true,
        });
      }

      const lines = filtered.map(m => {
        const rarity = m.rarity?.toLowerCase();
        const color =
          rarity === "rare" ? "🔵" :
          rarity === "epic" ? "🟢" :
          "⚪";

        return `${color} **${m.name}** — ${m.region || "Unknown Region"}`;
      });

      const chunkSize = 30;
      const chunks = [];
      for (let i = 0; i < lines.length; i += chunkSize) {
        chunks.push(lines.slice(i, i + chunkSize));
      }

      const note =
        `\n\n*Only* **🔵 Rare** and **🟢 Epic** are shown.\n` +
        `*⚪ Common, 🟣 Exotic, 🟠 Legendary and 🛒 Shop Miscrits are available every day.*`;

      for (let i = 0; i < chunks.length; i++) {
        const embed = new EmbedBuilder()
          .setTitle(`📅 Miscrits on ${day} (${i + 1}/${chunks.length})`)
          .setDescription(chunks[i].join("\n") + (i === chunks.length - 1 ? note : ""))
          .setColor(0x2b6cb0);

        if (i === 0) {
          await interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
          await interaction.followUp({ embeds: [embed], ephemeral: true });
        }
      }
    } catch (error) {
      console.error("❌ Error in /miscrits command:", error);
      try {
        await interaction.reply({
          content: "❌ An error occurred while executing this command!",
          ephemeral: true,
        });
      } catch {}
    }
  },
};
