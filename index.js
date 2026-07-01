// index.js
import { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } from "discord.js";
import fs from "fs";
import express from "express";
import http from "http";
import * as logic from "./logic.js";

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const PORT = process.env.PORT || 3000;

/* =====================
CLIENT
===================== */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

/* =====================
EXPRESS + KEEP-ALIVE
===================== */
const app = express();
app.get("/", (_, res) => res.send("Gaburon operativo. Ilblu permanece protegido."));
app.get("/ping", (_, res) => res.send("Gaburon activo 🛡️"));
app.listen(PORT, () => console.log(`🌐 Servidor activo en puerto ${PORT}`));

// Mantener vivo el servicio para Render
setInterval(() => {
  http.get(`http://localhost:${PORT}/ping`).on("error", () => {});
}, 5 * 60 * 1000);

/* =====================
CARGAR COMANDOS DESDE cmd.json
===================== */
const cmdData = JSON.parse(fs.readFileSync("./cmd.json", "utf8"));
const commands = cmdData.map(c => {
  let builder = new SlashCommandBuilder()
    .setName(c.name)
    .setDescription(c.description);

  if (c.options) {
    for (const opt of c.options) {
      if (opt.type === "string")
        builder.addStringOption(o =>
          o.setName(opt.name).setDescription(opt.description).setRequired(opt.required)
        );
      if (opt.type === "user")
        builder.addUserOption(o =>
          o.setName(opt.name).setDescription(opt.description).setRequired(opt.required)
        );
      if (opt.type === "channel")
        builder.addChannelOption(o =>
          o.setName(opt.name).setDescription(opt.description).setRequired(opt.required)
        );
    }
  }
  return builder;
});

const rest = new REST({ version: "10" }).setToken(TOKEN);

/* =====================
READY
===================== */
client.once(Events.ClientReady, async () => {
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log(`🛡️ Gaburon en línea como ${client.user.tag}`);
  } catch (err) {
    console.error("Error registrando comandos:", err);
  }
});

/* =====================
INTERACTIONS
===================== */
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const name = interaction.commandName;
  try {
    if (logic[name]) {
      await logic[name](interaction);
    } else {
      await interaction.reply({ content: "Comando no implementado en logic.js", ephemeral: true });
    }
  } catch (err) {
    console.error(`Error ejecutando comando ${name}:`, err);
    await interaction.reply({ content: "Error interno al ejecutar el comando.", ephemeral: true });
  }
});

/* =====================
AUTO-UPDATE COUNTERS
===================== */
async function updateCounters(guild) {
  try {
    const members = await guild.members.fetch();
    const humans = members.filter(m => !m.user.bot).size;
    const bots = members.filter(m => m.user.bot).size;

    if (config.counters.users) {
      const ch = guild.channels.cache.get(config.counters.users);
      if (ch) await ch.setName(`👤 Exploradores: ${humans}`);
    }
    if (config.counters.bots) {
      const ch = guild.channels.cache.get(config.counters.bots);
      if (ch) await ch.setName(`🤖 Unidades: ${bots}`);
    }
  } catch (err) {
    console.error("Error actualizando contadores:", err);
  }
}

client.on(Events.GuildMemberAdd, async member => {
  await updateCounters(member.guild);
});

client.on(Events.GuildMemberRemove, async member => {
  await updateCounters(member.guild);
});

/* =====================
LOGIN
===================== */
client.login(TOKEN).catch(err => console.error("Error login Gaburon:", err));
