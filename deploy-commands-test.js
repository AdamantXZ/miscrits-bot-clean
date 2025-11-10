// deploy-commands-test.js - Versão adaptada para testes locais
require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const token = process.env.BOT_TOKEN;
const clientId = process.env.APPLICATION_ID; // ✅ Usando APPLICATION_ID igual ao deploy original
const guildId = process.env.GUILD_ID; // SEU servidor para testes

if (!token || !clientId || !guildId) {
  console.error("❌ Faltando BOT_TOKEN, APPLICATION_ID ou GUILD_ID no .env");
  process.exit(1);
}

(async () => {
  try {
    console.log("🚀 Registrando comandos de TESTE no servidor específico...");

    const rest = new REST({ version: "10" }).setToken(token);

    // ===========================================
    // 🎯 Comando principal: /miscrits-test
    // ===========================================
    const miscritsCommand = new SlashCommandBuilder()
      .setName("miscrits-test") // ✅ Nome diferente para testes
      .setDescription("TESTE - Comandos relacionados aos Miscrits");

    // 📘 Subcomando: /miscrits-test info
    miscritsCommand.addSubcommand(sub =>
      sub
        .setName("info")
        .setDescription("TESTE - Mostra informações sobre um Miscrit específico")
        .addStringOption(opt =>
          opt
            .setName("name")
            .setDescription("Nome do Miscrit")
            .setRequired(true)
            .setAutocomplete(true)
        )
    );

    // 📗 Subcomando: /miscrits-test moves-and-evos
    miscritsCommand.addSubcommand(sub =>
      sub
        .setName("moves-and-evos")
        .setDescription("TESTE - Mostra os golpes e evoluções do Miscrit")
        .addStringOption(opt =>
          opt
            .setName("name")
            .setDescription("Nome do Miscrit")
            .setRequired(true)
            .setAutocomplete(true)
        )
    );

    // 📙 Subcomando: /miscrits-test relics
    miscritsCommand.addSubcommand(sub =>
      sub
        .setName("relics")
        .setDescription("TESTE - Mostra o conjunto de relíquias recomendado para o Miscrit")
        .addStringOption(opt =>
          opt
            .setName("name")
            .setDescription("Nome do Miscrit")
            .setRequired(true)
            .setAutocomplete(true)
        )
    );

    // 📒 Subcomando: /miscrits-test spawn-days
    miscritsCommand.addSubcommand(sub =>
      sub
        .setName("spawn-days")
        .setDescription("TESTE - Mostra os Miscrits que aparecem em um dia da semana")
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

    // 📕 Subcomando: /miscrits-test tierlist
    miscritsCommand.addSubcommand(sub =>
      sub
        .setName("tierlist")
        .setDescription("TESTE - Exibe a Tier List PvP dos Miscrits")
    );

    // ===========================================
    // 🚀 Registrar comando no servidor específico
    // ===========================================
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: [miscritsCommand.toJSON()],
    });

    console.log("✅ Comandos de TESTE registrados com sucesso!");
    console.log("📋 Disponíveis apenas no seu servidor:");
    console.log("   /miscrits-test info [nome]");
    console.log("   /miscrits-test moves-and-evos [nome]");
    console.log("   /miscrits-test relics [nome]");
    console.log("   /miscrits-test spawn-days [dia]");
    console.log("   /miscrits-test tierlist");
    console.log("");
    console.log("🔧 Após testar, use 'node deploy-commands.js' para deploy global");
  } catch (err) {
    console.error("❌ Erro ao registrar comandos de teste:", err);
  }
})();