import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ChannelType,
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  EmbedBuilder
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
app.listen(PORT, () =>
  console.log(`🌐 Servidor activo en puerto ${PORT}`)
);

/* =====================
CLIENT
===================== */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

/* =====================
SLASH COMMANDS
===================== */
const commands = [
  new SlashCommandBuilder()
    .setName("anuncio")
    .setDescription("Emitir anuncio oficial")
    .addStringOption(o =>
      o.setName("mensaje").setDescription("Mensaje").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("alianza")
    .setDescription("Registrar alianza")
    .addStringOption(o =>
      o.setName("servidor").setDescription("Servidor").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("descripcion").setDescription("Descripción").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("castigar")
    .setDescription("Ejecutar sentencia del Abismo")
    .addUserOption(o =>
      o.setName("usuario").setDescription("Entidad").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("castigo")
        .setDescription("Tipo de castigo")
        .setRequired(true)
        .addChoices(...punishments.map(p => ({ name: p.nombre, value: p.id })))
    ),

  new SlashCommandBuilder()
    .setName("createhuman")
    .setDescription("Crear contador de humanos")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  new SlashCommandBuilder()
    .setName("createbot")
    .setDescription("Crear contador de bots")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  ...["anuncios","castigos","bienvenidas","despedidas","alianzas","boost"].map(c =>
    new SlashCommandBuilder()
      .setName(`setchannel${c}`)
      .setDescription(`Configurar canal ${c}`)
      .addChannelOption(o => o.setName("canal").setDescription("Seleccionar canal").setRequired(true))
      .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
  )
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

/* =====================
READY
===================== */
client.once(Events.ClientReady, async () => {
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );

  console.log(`🛡️ Gaburon en línea como ${client.user.tag}`);
  setInterval(updateCounters, 5 * 60 * 1000);
});

/* =====================
INTERACTIONS
===================== */
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  /* ===== SET CHANNELS ===== */
  if (interaction.commandName.startsWith("setchannel")) {
    const tipo = interaction.commandName.replace("setchannel", "");
    const canal = interaction.options.getChannel("canal");

    if (!canal || canal.type !== ChannelType.GuildText) {
      return interaction.reply({ content: "Canal inválido.", ephemeral: true });
    }

    config.channels[tipo] = canal.id;
    saveConfig();

    return interaction.reply({ content: `Canal ${tipo} configurado.`, ephemeral: true });
  }

  /* ===== ANUNCIO ===== */
  if (interaction.commandName === "anuncio") {
    const ch = interaction.guild.channels.cache.get(config.channels.anuncios);
    if (!ch) return interaction.reply({ content: "Canal no configurado.", ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle("📢 COMUNICADO DEL SISTEMA")
      .setDescription(interaction.options.getString("mensaje"))
      .setFooter({ text: "Emitido por GABURON" });

    await ch.send({ embeds: [embed] });
    return interaction.reply({ content: "Anuncio enviado.", ephemeral: true });
  }

  /* ===== ALIANZA ===== */
  if (interaction.commandName === "alianza") {
    const ch = interaction.guild.channels.cache.get(config.channels.alianzas);
    if (!ch) return interaction.reply({ content: "Canal no configurado.", ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle("🔗 NUEVA ALIANZA")
      .addFields(
        { name: "Servidor", value: interaction.options.getString("servidor") },
        { name: "Descripción", value: interaction.options.getString("descripcion") }
      )
      .setFooter({ text: "Gaburon supervisa el pacto" });

    await ch.send({ content: "@everyone", embeds: [embed] });
    return interaction.reply({ content: "Alianza registrada.", ephemeral: true });
  }

  /* ===== CASTIGAR ===== */
  if (interaction.commandName === "castigar") {
    await interaction.deferReply({ ephemeral: true });

    const user = interaction.options.getUser("usuario");
    const castigoId = interaction.options.getString("castigo");
    const data = punishments.find(p => p.id === castigoId);
    if (!data) return interaction.editReply("Castigo inexistente.");

    const member = await interaction.guild.members.fetch(user.id);

    if (data.action === "timeout") {
      await member.timeout(data.duration, "Sentencia de Gaburon");
    }
    if (data.action === "ban") {
      await member.ban({ reason: "Sentencia absoluta de Gaburon" });
    }

    const ch = interaction.guild.channels.cache.get(config.channels.castigos);
    if (ch) {
      await ch.send(
        `⚠️ **SENTENCIA DEL ABISMO**\nEntidad: ${user}\nCastigo: **${data.nombre}**\nDescripción: ${data.descripcion}\nAutor: **GABURON**`
      );
    }

    return interaction.editReply(`Castigo aplicado: ${data.nombre}`);
  }

  /* ===== CREATE HUMAN COUNTER ===== */
  if (interaction.commandName === "createhuman") {
    const members = await interaction.guild.members.fetch();
    const humans = members.filter(m => !m.user.bot).size;

    const ch = await interaction.guild.channels.create({
      name: `👤 Exploradores: ${humans}`,
      type: ChannelType.GuildVoice,
      permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionsBitField.Flags.Connect] }]
    });

    config.counters.users = ch.id;
    saveConfig();
    return interaction.reply({ content: "Contador humano creado.", ephemeral: true });
  }

  /* ===== CREATE BOT COUNTER ===== */
  if (interaction.commandName === "createbot") {
    const members = await interaction.guild.members.fetch();
    const bots = members.filter(m => m.user.bot).size;

    const ch = await interaction.guild.channels.create({
      name: `🤖 Unidades: ${bots}`,
      type: ChannelType.GuildVoice,
      permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionsBitField.Flags.Connect] }]
    });

    config.counters.bots = ch.id;
    saveConfig();
    return interaction.reply({ content: "Contador bot creado.", ephemeral: true });
  }
});

/* =====================
COUNTERS UPDATE
===================== */
async function updateCounters() {
  for (const guild of client.guilds.cache.values()) {
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
  }
}

/* =====================
WELCOME / LEAVE
===================== */
client.on(Events.GuildMemberAdd, async member => {
  const ch = member.guild.channels.cache.get(config.channels.bienvenidas);
  if (!ch) return;

  ch.send(`🛡️ **ENTRADA REGISTRADA**\nEntidad: ${member}\nSistema: GABURON`);
});

client.on(Events.GuildMemberRemove, async member => {
  const ch = member.guild.channels.cache.get(config.channels.despedidas);
  if (!ch) return;

  ch.send(`📜 **SALIDA REGISTRADA**\nEntidad: ${member.user.tag}\nSistema: GABURON`);
});

/* =====================
BOOST
===================== */
client.on(Events.GuildMemberUpdate, async (oldM, newM) => {
  if (!oldM.premiumSince && newM.premiumSince && config.channels.boost) {
    const ch = await newM.guild.channels.fetch(config.channels.boost).catch(() => null);
    if (!ch) return;

    ch.send(`✨ **REFUERZO DETECTADO**\nUnidad: ${newM}\nIlblu ha sido fortalecido.`);
  }
});

/* =====================
LOGIN
===================== */
client.login(TOKEN);
