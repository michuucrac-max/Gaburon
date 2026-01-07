import {
  Client,
  GatewayIntentBits,
  Events,
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType
} from "discord.js";
import fs from "fs";
import express from "express";

/* =====================
ENV
===================== */
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const PORT = process.env.PORT || 3000;

/* =====================
FILES
===================== */
const CONFIG_PATH = "./config.json";
const PUNISH_PATH = "./punishments.json";

/* =====================
DEFAULT CONFIG
===================== */
const defaultConfig = {
  channels: {
    anuncios: null,
    castigos: null,
    bienvenidas: null,
    despedidas: null,
    alianzas: null,
    boost: null
  },
  counters: {
    users: null,
    bots: null
  }
};

const config = fs.existsSync(CONFIG_PATH)
  ? JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"))
  : structuredClone(defaultConfig);

const punishments = fs.existsSync(PUNISH_PATH)
  ? JSON.parse(fs.readFileSync(PUNISH_PATH, "utf8"))
  : [];

const saveConfig = () =>
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

/* =====================
EXPRESS
===================== */
const app = express();
app.get("/", (_, res) =>
  res.send("Gaburon operativo. Ilblu permanece protegido.")
);
app.listen(PORT);

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
SLASH COMMANDS
===================== */
const commands = [
  new SlashCommandBuilder()
    .setName("anunce")
    .setDescription("Transmisión oficial de Gaburon")
    .addStringOption(o =>
      o.setName("mensaje").setDescription("Mensaje").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("castigar")
    .setDescription("Ejecutar sentencia del Abismo")
    .addUserOption(o =>
      o.setName("usuario").setDescription("Entidad objetivo").setRequired(true)
    )
    .addStringOption(o => {
      o.setName("castigo")
        .setDescription("Tipo de castigo")
        .setRequired(true);
      punishments.forEach(p =>
        o.addChoices({ name: p.nombre, value: p.id })
      );
      return o;
    }),

  new SlashCommandBuilder()
    .setName("createuser")
    .setDescription("Crear contador de exploradores")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  new SlashCommandBuilder()
    .setName("createbot")
    .setDescription("Crear contador de unidades mecánicas")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  ...["anuncios","castigos","bienvenidas","despedidas","alianzas","boost"].map(c =>
    new SlashCommandBuilder()
      .setName(`setchannel${c}`)
      .setDescription(`Asignar canal ${c}`)
      .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
  )
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

/* =====================
INTERACTIONS
===================== */
client.on(Events.InteractionCreate, async interaction => {

  /* ===== CHANNEL SELECT ===== */
  if (interaction.isChannelSelectMenu()) {
    const id = interaction.customId.replace("set_", "");
    config.channels[id] = interaction.values[0];
    saveConfig();
    return interaction.update({
      content: "Canal registrado por Gaburon.",
      components: []
    });
  }

  if (!interaction.isChatInputCommand()) return;

  /* ===== SETCHANNEL ===== */
  if (interaction.commandName.startsWith("setchannel")) {
    const id = interaction.commandName.replace("setchannel", "");
    const menu = new ChannelSelectMenuBuilder()
      .setCustomId(`set_${id}`)
      .addChannelTypes(ChannelType.GuildText)
      .setMinValues(1)
      .setMaxValues(1);

    return interaction.reply({
      ephemeral: true,
      components: [new ActionRowBuilder().addComponents(menu)]
    });
  }

  /* ===== CREATE USER COUNTER ===== */
  if (interaction.commandName === "createuser") {
    await interaction.deferReply({ ephemeral: true });
    const members = await interaction.guild.members.fetch();
    const count = members.filter(m => !m.user.bot).size;

    const ch = await interaction.guild.channels.create({
      name: `Exploradores: ${count}`,
      type: ChannelType.GuildVoice,
      permissionOverwrites: [{
        id: interaction.guild.id,
        deny: [PermissionsBitField.Flags.Connect]
      }]
    });

    config.counters.users = ch.id;
    saveConfig();
    return interaction.editReply("Contador humano operativo.");
  }

  /* ===== CREATE BOT COUNTER ===== */
  if (interaction.commandName === "createbot") {
    await interaction.deferReply({ ephemeral: true });
    const members = await interaction.guild.members.fetch();
    const count = members.filter(m => m.user.bot).size;

    const ch = await interaction.guild.channels.create({
      name: `Unidades: ${count}`,
      type: ChannelType.GuildVoice,
      permissionOverwrites: [{
        id: interaction.guild.id,
        deny: [PermissionsBitField.Flags.Connect]
      }]
    });

    config.counters.bots = ch.id;
    saveConfig();
    return interaction.editReply("Contador mecánico operativo.");
  }

  /* ===== CASTIGAR ===== */
  if (interaction.commandName === "castigar") {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser("usuario");
    const id = interaction.options.getString("castigo");
    const data = punishments.find(p => p.id === id);
    const member = await interaction.guild.members.fetch(target.id);

    if (data.action === "timeout")
      await member.timeout(data.duration, "Gaburon");
    if (data.action === "ban")
      await member.ban({ reason: "Gaburon" });

    if (config.channels.castigos) {
      const ch = await interaction.guild.channels.fetch(config.channels.castigos);
      if (ch)
        ch.send(
          `**SENTENCIA DEL ABISMO**\n` +
          `Entidad: ${target}\n` +
          `Castigo: ${data.nombre}\n` +
          `Ejecutor: **GABURON**`
        );
    }

    return interaction.editReply("Sentencia ejecutada.");
  }

  /* ===== ANUNCE ===== */
  if (interaction.commandName === "anunce") {
    await interaction.deferReply({ ephemeral: true });
    const ch = await interaction.guild.channels.fetch(config.channels.anuncios);
    if (ch)
      ch.send(`**TRANSMISIÓN — GABURON**\n${interaction.options.getString("mensaje")}`);
    return interaction.editReply("Transmisión enviada.");
  }
});

/* =====================
COUNTERS UPDATE
===================== */
async function updateCounters() {
  for (const g of client.guilds.cache.values()) {
    const m = await g.members.fetch();
    if (config.counters.users) {
      const ch = g.channels.cache.get(config.counters.users);
      if (ch) ch.setName(`Exploradores: ${m.filter(x => !x.user.bot).size}`);
    }
    if (config.counters.bots) {
      const ch = g.channels.cache.get(config.counters.bots);
      if (ch) ch.setName(`Unidades: ${m.filter(x => x.user.bot).size}`);
    }
  }
}

/* =====================
WELCOME / LEAVE
===================== */
client.on(Events.GuildMemberAdd, async m => {
  if (!config.channels.bienvenidas) return;
  const ch = await m.guild.channels.fetch(config.channels.bienvenidas);
  if (ch)
    ch.send(`**ENTRADA**\nEntidad: ${m}\nEstado: monitoreado por Gaburon.`);
});

client.on(Events.GuildMemberRemove, async m => {
  if (!config.channels.despedidas) return;
  const ch = await m.guild.channels.fetch(config.channels.despedidas);
  if (ch)
    ch.send(`**SALIDA**\nEntidad: ${m.user.tag}\nRegistro cerrado.`);
});

/* =====================
BOOST
===================== */
client.on(Events.GuildMemberUpdate, async (o, n) => {
  if (!o.premiumSince && n.premiumSince && config.channels.boost) {
    const ch = await n.guild.channels.fetch(config.channels.boost);
    if (ch)
      ch.send(`**REFUERZO**\nUnidad: ${n}\nIlblu fortalecido.`);
  }
});

/* =====================
READY
===================== */
client.once(Events.ClientReady, async () => {
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  setInterval(updateCounters, 5 * 60 * 1000);
});

/* =====================
LOGIN
===================== */
client.login(TOKEN);
