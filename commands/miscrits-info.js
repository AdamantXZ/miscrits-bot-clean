// commands/miscrits-info.js - VERSÃO DEBUG
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

console.log("✅ miscrits-info.js carregado - INÍCIO");

// ✅ CARREGAMENTO SIMPLES SEM REQUISIÇÕES
const miscrits = [
  { name: "Test Miscrit", rarity: "common", type: "test" }
];

console.log("✅ Dados de teste carregados");

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
    console.log("✅ Autocomplete chamado");
    try {
      const focused = (interaction.options.getFocused() || "").trim().toLowerCase();
      
      // ✅ DADOS FIXOS PARA TESTE
      const results = [
        { name: "Test Miscrit", value: "Test Miscrit" }
      ];
      
      await interaction.respond(results);
      console.log("✅ Autocomplete respondido");
    } catch (err) {
      console.error("❌ Autocomplete error:", err);
      try {
        await interaction.respond([]);
      } catch {}
    }
  },

  async execute(interaction) {
    console.log("✅ Execute chamado");
    try {
      await interaction.reply({ 
        content: "✅ Comando funcionando! (versão debug)", 
        ephemeral: true 
      });
      console.log("✅ Execute concluído");
    } catch (err) {
      console.error("❌ Command execution error:", err);
      try {
        await interaction.reply({ content: "❌ Error executing command!", ephemeral: true });
      } catch {}
    }
  },
};

console.log("✅ miscrits-info.js carregado - FIM");