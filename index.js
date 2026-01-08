// =======================================
// MARULK — CASINO ABISMAL (MADE IN ABYSS)
// index.js (ESM)
// =======================================

import {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} from "discord.js";

import {
  REST,
  Routes,
  SlashCommandBuilder
} from "@discordjs/rest";

import fs from "fs";
import express from "express";
import http from "http";

// =======================================
// ENV (RENDER)
// =======================================

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const PORT = process.env.PORT || 3000;

if (!TOKEN || !CLIENT_ID) {
  console.error("Faltan variables de entorno");
  process.exit(1);
}

// =======================================
// KEEP ALIVE
// =======================================

const app = express();
app.get("/", (_, res) => res.send("Marulk observa el Abismo"));
app.get("/ping", (_, res) => res.send("pong"));
app.listen(PORT);

setInterval(() => {
  try { http.get(`http://localhost:${PORT}/ping`); } catch {}
}, 300000);

// =======================================
// CONSTANTES
// =======================================

const DATA_FILE = "./fichas.json";
const CONFIG_FILE = "./config.json";

const MIN_APUESTA = 5;
const MAX_APUESTA = 300;

// =======================================
// CLIENT
// =======================================

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// =======================================
// UTILIDADES JSON
// =======================================

function loadJSON(path, def) {
  if (!fs.existsSync(path)) {
    fs.writeFileSync(path, JSON.stringify(def, null, 2));
    return def;
  }
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function saveJSON(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

// =======================================
// DATA
// =======================================

let fichas = loadJSON(DATA_FILE, {});
let config = loadJSON(CONFIG_FILE, {
  casinoChannel: null,
  topsCasinoChannel: null
});

function getFichas(id) {
  if (!fichas[id]) fichas[id] = 100;
  return fichas[id];
}

function setFichas(id, n) {
  fichas[id] = Math.max(0, n);
  saveJSON(DATA_FILE, fichas);
}

function addFichas(id, n) {
  setFichas(id, getFichas(id) + n);
}

function removeFichas(id, n) {
  setFichas(id, getFichas(id) - n);
}

// =======================================
// ESTADO DE JUEGOS
// =======================================

const partidas = new Map(); // channelId -> gameState

// =======================================
// COMANDOS
// =======================================

const commands = [
  new SlashCommandBuilder()
    .setName("fichas")
    .setDescription("Ver tus fichas abisales"),

  new SlashCommandBuilder()
    .setName("rules")
    .setDescription("Reglas y juegos del Casino Abismal"),

  new SlashCommandBuilder()
    .setName("setchannelcasino")
    .setDescription("Configurar canal del casino")
    .addChannelOption(o => o.setName("canal").setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  new SlashCommandBuilder()
    .setName("setchanneltopscasino")
    .setDescription("Configurar canal de tops del casino")
    .addChannelOption(o => o.setName("canal").setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  new SlashCommandBuilder()
    .setName("setfichas")
    .setDescription("Establecer fichas a un usuario")
    .addUserOption(o => o.setName("usuario").setRequired(true))
    .addIntegerOption(o => o.setName("cantidad").setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  new SlashCommandBuilder()
    .setName("addfichas")
    .setDescription("Añadir fichas a un usuario")
    .addUserOption(o => o.setName("usuario").setRequired(true))
    .addIntegerOption(o => o.setName("cantidad").setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  new SlashCommandBuilder()
    .setName("removefichas")
    .setDescription("Quitar fichas a un usuario")
    .addUserOption(o => o.setName("usuario").setRequired(true))
    .addIntegerOption(o => o.setName("cantidad").setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
].map(c => c.toJSON());

// =======================================
// REGISTRO
// =======================================

const rest = new REST({ version: "10" }).setToken(TOKEN);
await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

// =======================================
// READY
// =======================================

client.once("ready", () => {
  console.log(`Marulk despierta como ${client.user.tag}`);
  startCasinoTops();
});

// =======================================
// TOPS CASINO (REALES)
// =======================================

function startCasinoTops() {
  setInterval(async () => {
    if (!config.topsCasinoChannel) return;

    const guild = client.guilds.cache.first();
    const channel = await guild.channels.fetch(config.topsCasinoChannel).catch(() => null);
    if (!channel) return;

    const top = Object.entries(fichas)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (!top.length) return;

    const lines = [];
    for (let i = 0; i < top.length; i++) {
      const user = await client.users.fetch(top[i][0]).catch(() => null);
      if (user) lines.push(`**${i + 1}.** ${user.username} — ${top[i][1]} fichas`);
    }

    const embed = new EmbedBuilder()
      .setTitle("🏆 Dominadores del Casino Abismal")
      .setDescription(lines.join("\n"));

    channel.send({ embeds: [embed] });
  }, 60 * 60 * 1000);
}

// =======================================
// MENÚ DEL CASINO (AUTO)
// =======================================

async function postCasinoMenu(channel) {
  const embed = new EmbedBuilder()
    .setTitle("🎴 Casino Abismal")
    .setDescription(
      "El Abismo observa cada decisión.\n\n" +
      "(Este espacio es narrativo y lúdico, no promueve comportamientos dañinos.)\n\n" +
      "**Elige tu destino:**"
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("vs_bot").setLabel("Jugar contra Marulk").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("vs_player").setLabel("Jugar contra Explorador").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("rules").setLabel("Reglas").setStyle(ButtonStyle.Success)
  );

  await channel.send({ embeds: [embed], components: [row] });
}

// =======================================
// INTERACCIONES
// =======================================

client.on("interactionCreate", async i => {
  try {
    // ---------- SLASH ----------
    if (i.isChatInputCommand()) {
      if (i.commandName === "fichas") {
        return i.reply({ content: `Tienes ${getFichas(i.user.id)} fichas`, ephemeral: true });
      }

      if (i.commandName === "rules") {
        return i.reply({
          ephemeral: true,
          embeds: [new EmbedBuilder()
            .setTitle("📜 Juegos del Abismo")
            .setDescription(
              "1️⃣ Prueba de la Maldición\n" +
              "2️⃣ Reliquia Inestable\n" +
              "3️⃣ Juicio del Silbato\n" +
              "4️⃣ Memoria del Abismo\n" +
              "5️⃣ Duelo de Narehates\n" +
              "6️⃣ Contrato de Idofront\n" +
              "7️⃣ Descenso Controlado"
            )]
        });
      }

      if (i.commandName === "setchannelcasino") {
        const ch = i.options.getChannel("canal");
        config.casinoChannel = ch.id;
        saveJSON(CONFIG_FILE, config);
        await i.reply({ content: "Canal del casino configurado", ephemeral: true });
        await postCasinoMenu(ch);
      }

      if (i.commandName === "setchanneltopscasino") {
        config.topsCasinoChannel = i.options.getChannel("canal").id;
        saveJSON(CONFIG_FILE, config);
        return i.reply({ content: "Canal de tops configurado", ephemeral: true });
      }

      if (i.commandName === "setfichas") {
        setFichas(i.options.getUser("usuario").id, i.options.getInteger("cantidad"));
        return i.reply({ content: "Fichas establecidas", ephemeral: true });
      }

      if (i.commandName === "addfichas") {
        addFichas(i.options.getUser("usuario").id, i.options.getInteger("cantidad"));
        return i.reply({ content: "Fichas añadidas", ephemeral: true });
      }

      if (i.commandName === "removefichas") {
        removeFichas(i.options.getUser("usuario").id, i.options.getInteger("cantidad"));
        return i.reply({ content: "Fichas removidas", ephemeral: true });
      }
    }

    // ---------- BOTONES ----------
    if (i.isButton()) {
      if (i.customId === "rules") {
        return i.reply({ ephemeral: true, content: "Consulta /rules para ver las reglas completas." });
      }

      if (i.customId === "vs_bot") {
        return i.reply({
          ephemeral: true,
          content: "Has descendido solo. Marulk observa… (lógica del juego continúa aquí)"
        });
      }

      if (i.customId === "vs_player") {
        return i.reply({
          ephemeral: true,
          content: "Invitación enviada. Esperando aceptación…"
        });
      }
    }

  } catch (err) {
    console.error("Error:", err);
  }
});

// =======================================
// LOGIN
// =======================================

client.login(TOKEN);

// =======================================
// PROTECCIÓN GLOBAL
// =======================================

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);
