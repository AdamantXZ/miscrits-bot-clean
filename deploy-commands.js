// ✅ deploy-commands.js — versão avançada (com subcomandos)
require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const token = process.env.BOT_TOKEN;
const clientId = process.env.APPLICATION_ID; // <- usa o mesmo ID do app
if (!token || !clientId) {
  console.error("❌ Faltando BOT_TOKEN ou APPLICATION_ID no .env");
  process.exit(1);
}

(async () => {
  try {
    console.log("🚀 Registrando comandos globais...");

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
    // 🚀 Registrar comando global
    // ===========================================
    await rest.put(Routes.applicationCommands(clientId), {
      body: [miscritsCommand.toJSON()],
    });

    console.log("✅ Comandos registrados com sucesso!");
    console.log("📋 Disponíveis globalmente:");
    console.log("   /miscrits info");
    console.log("   /miscrits moves-and-evos");
    console.log("   /miscrits relics");
    console.log("   /miscrits spawn-days");
    console.log("   /miscrits tierlist");
  } catch (err) {
    console.error("❌ Erro ao registrar comandos:", err);
  }
})();
