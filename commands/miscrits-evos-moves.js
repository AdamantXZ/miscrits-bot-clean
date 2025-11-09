// commands/miscrits-evos-moves.js - CORRIGIDO
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const miscritsData = require("../data/miscrits.json");

const miscrits = Array.isArray(miscritsData.miscrits) ? miscritsData.miscrits : miscritsData;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("miscrits-evos-moves")
    .setDescription("Show wiki page for a specific Miscrit")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Name of the Miscrit")
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    try {
      // ✅ VERIFICA SE A INTERAÇÃO JÁ FOI PROCESSADA
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

      // ✅ VERIFICA NOVAMENTE ANTES DE RESPONDER
      if (!interaction.responded) {
        await interaction.respond(results);
      }
    } catch (err) {
      // ✅ IGNORA ERROS DE INTERAÇÃO JÁ PROCESSADA
      if (err.code === 10062 || err.code === 40060) return;
      console.error("Autocomplete error:", err);
    }
  },

  async execute(interaction) {
    try {
      console.log("✅ Executando comando moves-and-evos...");
      
      const name = interaction.options.getString("name").toLowerCase();
      const miscrit = miscrits.find((m) => m.name?.toLowerCase() === name);

      if (!miscrit) {
        // ✅ CORREÇÃO: Chamar reply() mesmo para erros
        return await interaction.reply({ content: "❌ Miscrit not found!", flags: 64 });
      }

      // ✅ EMBED 1: IMAGEM FIXA
      const embed1 = new EmbedBuilder()
        .setImage("https://i.imgur.com/dMyh4pu.png")
        .setColor(0x2b6cb0);

      // ✅ EMBED 2: INFORMAÇÕES DO WIKI COM NOME DO MISCRIT
      let description = "";
      
      if (miscrit.wiki_page) {
        description += `**${miscrit.name} Wiki Page:**\n${miscrit.wiki_page}`;
      } else {
        description += `**${miscrit.name} Wiki Page:** No wiki data available`;
      }

      const embed2 = new EmbedBuilder()
        .setDescription(description)
        .setColor(0x2b6cb0);

      // ✅ CORREÇÃO: Chamar interaction.reply() para enviar a resposta
      await interaction.reply({ 
        embeds: [embed1, embed2], 
        flags: 64 
      });
      console.log("✅ Resposta moves-and-evos enviada com sucesso!");
      
    } catch (err) {
      // ✅ IGNORA ERROS DE INTERAÇÃO EXPIRADA
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