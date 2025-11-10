// deploy-commands-test.js - Registro de comandos /miscrits-test (servidor de teste)
require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const token = process.env.BOT_TOKEN;
const clientId = process.env.APPLICATION_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error("❌ Faltando BOT_TOKEN, APPLICATION_ID ou GUILD_ID no .env");
  process.exit(1);
}

(async () => {
  try {
    console.log("🚀 Registrando comandos de TESTE (/miscrits-test)...");

    const rest = new REST({ version: "10" }).setToken(token);

    // Comando principal
    const miscritsCommand = new SlashCommandBuilder()
      .setName("miscrits-test")
      .setDescription("Comandos de teste dos Miscrits");

    miscritsCommand.addSubcommand(sub =>
      sub.setName("info")
        .setDescription("Mostra informações de um Miscrit")
        .addStringOption(opt =>
          opt.setName("name").setDescription("Nome do Miscrit").setRequired(true).setAutocomplete(true)
        )
    );

    miscritsCommand.addSubcommand(sub =>
      sub.setName("moves-and-evos")
        .setDescription("Mostra golpes e evoluções")
        .addStringOption(opt =>
          opt.setName("name").setDescription("Nome do Miscrit").setRequired(true).setAutocomplete(true)
        )
    );

    miscritsCommand.addSubcommand(sub =>
      sub.setName("relics")
        .setDescription("Mostra o conjunto de relíquias")
        .addStringOption(opt =>
          opt.setName("name").setDescription("Nome do Miscrit").setRequired(true).setAutocomplete(true)
        )
    );

    miscritsCommand.addSubcommand(sub =>
      sub.setName("spawn-days")
        .setDescription("Mostra Miscrits por dia da semana")
        .addStringOption(opt =>
          opt.setName("day").setDescription("Dia da semana").setRequired(true).addChoices(
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

    miscritsCommand.addSubcommand(sub =>
      sub.setName("tierlist").setDescription("Mostra a Tier List PvP")
    );

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: [miscritsCommand.toJSON()],
    });

    console.log("✅ /miscrits-test registrado com sucesso!");
    console.log("📋 Subcomandos:");
    console.log("   /miscrits-test info [name]");
    console.log("   /miscrits-test moves-and-evos [name]");
    console.log("   /miscrits-test relics [name]");
    console.log("   /miscrits-test spawn-days [day]");
    console.log("   /miscrits-test tierlist");
  } catch (err) {
    console.error("❌ Erro ao registrar comandos de teste:", err);
  }
})();
