// deploy-commands-test.js - Comandos de TESTE com /test
require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const token = process.env.BOT_TOKEN;
const clientId = process.env.APPLICATION_ID;
const guildId = process.env.GUILD_ID; // ✅ Servidor específico para testes

if (!token || !clientId || !guildId) {
  console.error("❌ Faltando BOT_TOKEN, APPLICATION_ID ou GUILD_ID no .env");
  process.exit(1);
}

(async () => {
  try {
    console.log("🚀 Registrando comandos de TESTE com /test...");

    const rest = new REST({ version: "10" }).setToken(token);

    // ===========================================
    // 🎯 Comando principal: /test
    // ===========================================
    const testCommand = new SlashCommandBuilder()
      .setName("test")
      .setDescription("Comandos de teste do MiscritBot");

    // 📘 Subcomando: /test info
    testCommand.addSubcommand(sub =>
      sub
        .setName("info")
        .setDescription("Mostra informações sobre um Miscrit específico")
        .addStringOption(opt =>
          opt
            .setName("name")
            .setDescription("Nome do Miscrit")
            .setRequired(true)
            .setAutocomplete(true)
        )
    );

    // 📗 Subcomando: /test moves-and-evos
    testCommand.addSubcommand(sub =>
      sub
        .setName("moves-and-evos")
        .setDescription("Mostra os golpes e evoluções do Miscrit")
        .addStringOption(opt =>
          opt
            .setName("name")
            .setDescription("Nome do Miscrit")
            .setRequired(true)
            .setAutocomplete(true)
        )
    );

    // 📙 Subcomando: /test relics
    testCommand.addSubcommand(sub =>
      sub
        .setName("relics")
        .setDescription("Mostra o conjunto de relíquias recomendado para o Miscrit")
        .addStringOption(opt =>
          opt
            .setName("name")
            .setDescription("Nome do Miscrit")
            .setRequired(true)
            .setAutocomplete(true)
        )
    );

    // 📒 Subcomando: /test spawn-days
    testCommand.addSubcommand(sub =>
      sub
        .setName("spawn-days")
        .setDescription("Mostra os Miscrits que aparecem em um dia da semana")
        .addStringOption(opt =>
          opt
            .setName("day")
            .setDescription("Dia da semana")
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
        )
    );

    // 📕 Subcomando: /test tierlist
    testCommand.addSubcommand(sub =>
      sub
        .setName("tierlist")
        .setDescription("Exibe a Tier List PvP dos Miscrits")
    );

    // ===========================================
    // 🚀 Registrar comando no servidor específico
    // ===========================================
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: [testCommand.toJSON()],
    });

    console.log("✅ Comandos de TESTE registrados com sucesso!");
    console.log("📋 Disponíveis no servidor específico:");
    console.log("   /test info [nome]");
    console.log("   /test moves-and-evos [nome]");
    console.log("   /test relics [nome]");
    console.log("   /test spawn-days [dia]");
    console.log("   /test tierlist");
    console.log("");
    console.log("📍 Comandos disponíveis APENAS no servidor:", guildId);
  } catch (err) {
    console.error("❌ Erro ao registrar comandos de teste:", err);
  }
})();