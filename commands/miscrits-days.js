// commands/miscrits-days.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const miscritsData = require("../data/miscrits.json");

const miscrits = Array.isArray(miscritsData.miscrits) ? miscritsData.miscrits : miscritsData;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("miscrits-days")
    .setDescription("Show Miscrits spawn for a specific day")
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
    try {
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
        return await interaction.reply({ content: `❌ No Miscrits found for **${day}**.`, flags: 64 });
      }

      const chunkSize = 30;
      const chunks = [];
      for (let i = 0; i < filtered.length; i += chunkSize) {
        chunks.push(filtered.slice(i, i + chunkSize));
      }

      const embedChunks = [];
      for (let i = 0; i < chunks.length; i++) {
        const lines = chunks[i].map((m) => {
          let emoji = "⚪";
          switch ((m.rarity || "").toLowerCase()) {
            case "rare": emoji = "🔵"; break;
            case "epic": emoji = "🟢"; break;
            case "exotic": emoji = "🟣"; break;
            case "legendary": emoji = "🟠"; break;
          }
          
          let pvpStatus = "";
          if (m.pvp_desired_status) {
            pvpStatus = ` — ${m.pvp_desired_status}`;
          }
          
          return `${emoji} **${m.name}** — ${m.region || "Unknown Region"}${pvpStatus}`;
        });

        const note = i === chunks.length - 1
          ? `\n\n*Only* **🔵 Rare** and **🟢 Epic** are shown.\n*⚪ Common, 🟣 Exotic, 🟠 Legendary and 🛒 Shop Miscrits are available every day.*`
          : "";

        const embed = new EmbedBuilder()
          .setDescription(lines.join("\n") + note)
          .setColor(0x2b6cb0);

        if (i === 0) {
          embed.setTitle(`🗓️ Miscrits Spawn on ${day}`);
        }

        embedChunks.push(embed);
      }

      const maxEmbedsPerMessage = 10;
      for (let i = 0; i < embedChunks.length; i += maxEmbedsPerMessage) {
        const embedsBatch = embedChunks.slice(i, i + maxEmbedsPerMessage);
        
        if (i === 0) {
          await interaction.reply({ embeds: embedsBatch, flags: 64 });
        } else {
          await interaction.followUp({ embeds: embedsBatch, flags: 64 });
        }
      }
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