// deploy-commands-test.js - IDÊNTICO ao deploy-commands.js mas para servidor específico
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
    console.log("🚀 Registrando comandos GLOBAIS de TESTE...");

    const rest = new REST({ version: "10" }).setToken(token);

    // ===========================================
    // 🎯 Comando principal: /miscrits
    // ===========================================
    const miscritsCommand = new SlashCommandBuilder()
      .setName("miscrits")
      .setDescription("Comandos relacionados aos Miscrits");

    // 📘 Subcomando: /miscrits info
    miscritsCommand.addSubcommand(sub =>
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

    // 📗 Subcomando: /miscrits moves-and-evos
    miscritsCommand.addSubcommand(sub =>
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

    // 📙 Subcomando: /miscrits relics
    miscritsCommand.addSubcommand(sub =>
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

    // 📒 Subcomando: /miscrits spawn-days
    miscritsCommand.addSubcommand(sub =>
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

    // 📕 Subcomando: /miscrits tierlist
    miscritsCommand.addSubcommand(sub =>
      sub
        .setName("tierlist")
        .setDescription("Exibe a Tier List PvP dos Miscrits")
    );

    // ===========================================
    // 🚀 Registrar comando no servidor específico
    // ===========================================
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: [miscritsCommand.toJSON()],
    });

    console.log("✅ Comandos de TESTE registrados com sucesso!");
    console.log("📋 Disponíveis no servidor específico:");
    console.log("   /miscrits info [nome]");
    console.log("   /miscrits moves-and-evos [nome]");
    console.log("   /miscrits relics [nome]");
    console.log("   /miscrits spawn-days [dia]");
    console.log("   /miscrits tierlist");
    console.log("");
    console.log("📍 Comandos disponíveis APENAS no servidor:", guildId);
  } catch (err) {
    console.error("❌ Erro ao registrar comandos de teste:", err);
  }
})();