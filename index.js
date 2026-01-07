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
  ButtonBuilder,
  ButtonStyle,
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
FILES / CONFIG
===================== */
const CONFIG_PATH = "./config.json";
const PUNISH_PATH = "./punishments.json";
const TICKETS_PATH = "./tickets.json";

const defaultConfig = {
  channels: {
    anuncios: null,
    castigos: null,
    bienvenidas: null,
    despedidas: null,
    alianzas: null,
    boost: null,
    tikets: null
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

const tickets = fs.existsSync(TICKETS_PATH)
  ? JSON.parse(fs.readFileSync(TICKETS_PATH, "utf8"))
  : {};

const saveConfig = () =>
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
const saveTickets = () =>
  fs.writeFileSync(TICKETS_PATH, JSON.stringify(tickets, null, 2));

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

  new SlashCommandBuilder()
    .setName("setchanneltikets")
    .setDescription("Configurar canal para tickets")
    .addChannelOption(o =>
      o.setName("canal").setDescription("Seleccionar canal").setRequired(true)
    )
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

  // Restaurar tickets activos al iniciar
  for (const tId in tickets) {
    const tData = tickets[tId];
    const guild = client.guilds.cache.get(tData.guild);
    if (!guild) continue;
    const channel = await guild.channels.fetch(tData.channel).catch(() => null);
    if (!channel) continue;

    // Re-crear botones en el canal del ticket
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`accept_${tId}`)
        .setLabel("Aceptar ticket")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`close_${tId}`)
        .setLabel("Cerrar ticket")
        .setStyle(ButtonStyle.Danger)
    );

    channel.send({ content: "Gaburon recuerda: espera a que un admin acepte tu ticket pacientemente", components: [row] });
  }
});

/* =====================
INTERACTIONS
===================== */
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  /* ===== SET CHANNELS ===== */
  if (interaction.isChatInputCommand() && interaction.commandName.startsWith("setchannel")) {
    const tipo = interaction.commandName.replace("setchannel", "");
    const canal = interaction.options.getChannel("canal");

    if (!canal || canal.type !== ChannelType.GuildText) {
      return interaction.reply({ content: "Canal inválido.", ephemeral: true });
    }

    config.channels[tipo] = canal.id;
    saveConfig();

    return interaction.reply({ content: `Canal ${tipo} configurado.`, ephemeral: true });
  }

  /* ===== TICKETS - SET CHANNEL ===== */
  if (interaction.isChatInputCommand() && interaction.commandName === "setchanneltikets") {
    const canal = interaction.options.getChannel("canal");
    if (!canal || canal.type !== ChannelType.GuildText)
      return interaction.reply({ content: "Canal inválido.", ephemeral: true });

    config.channels.tikets = canal.id;
    saveConfig();

    // Mensaje con botones
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_ticket")
        .setLabel("Abrir ticket")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("open_ticket_ally")
        .setLabel("Abrir ticket ally")
        .setStyle(ButtonStyle.Secondary)
    );

    await canal.send({ content: "📜 Selecciona el tipo de ticket:", components: [row] });
    return interaction.reply({ content: "Canal de tickets configurado.", ephemeral: true });
  }

  /* ===== ANUNCIO ===== */
  if (interaction.isChatInputCommand() && interaction.commandName === "anuncio") {
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
  if (interaction.isChatInputCommand() && interaction.commandName === "alianza") {
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
  if (interaction.isChatInputCommand() && interaction.commandName === "castigar") {
    await interaction.deferReply({ ephemeral: true });

    const user = interaction.options.getUser("usuario");
    const castigoId = interaction.options.getString("castigo");
    const data = punishments.find(p => p.id === castigoId);
    if (!data) return interaction.editReply("Castigo inexistente.");

    const member = await interaction.guild.members.fetch(user.id);

    if (data.action === "timeout") await member.timeout(data.duration, "Sentencia de Gaburon");
    if (data.action === "ban") await member.ban({ reason: "Sentencia absoluta de Gaburon" });

    const ch = interaction.guild.channels.cache.get(config.channels.castigos);
    if (ch) {
      await ch.send(
        `⚠️ **SENTENCIA DEL ABISMO**\nEntidad: ${user}\nCastigo: **${data.nombre}**\nDescripción: ${data.descripcion}\nAutor: **GABURON**`
      );
    }

    return interaction.editReply(`Castigo aplicado: ${data.nombre}`);
  }

  /* ===== CREATE HUMAN COUNTER ===== */
  if (interaction.isChatInputCommand() && interaction.commandName === "createhuman") {
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
  if (interaction.isChatInputCommand() && interaction.commandName === "createbot") {
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

  /* ===== BUTTONS TICKETS ===== */
  if (interaction.isButton()) {
    const guild = interaction.guild;

    // Abrir ticket
    if (interaction.customId === "open_ticket" || interaction.customId === "open_ticket_ally") {
      const type = interaction.customId === "open_ticket_ally" ? "Alianza" : "General";

      const ticketChannel = await guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          // Todos los administradores
          ...guild.roles.cache.filter(r => r.permissions.has(PermissionsBitField.Flags.Administrator)).map(r => ({
            id: r.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels]
          }))
        ]
      });

      const ticketId = ticketChannel.id;
      tickets[ticketId] = {
        channel: ticketChannel.id,
        user: interaction.user.id,
        type,
        guild: guild.id,
        accepted: false
      };
      saveTickets();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`accept_${ticketId}`)
          .setLabel("Aceptar ticket")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`close_${ticketId}`)
          .setLabel("Cerrar ticket")
          .setStyle(ButtonStyle.Danger)
      );

      await ticketChannel.send({ content: `📌 Ticket creado por ${interaction.user}. Tipo: ${type}\nEspera a que un admin acepte tu ticket pacientemente.`, components: [row] });
      return interaction.reply({ content: `Ticket ${type} creado: ${ticketChannel}`, ephemeral: true });
    }

    // Aceptar ticket
    if (interaction.customId.startsWith("accept_")) {
      const tId = interaction.customId.replace("accept_", "");
      const tData = tickets[tId];
      if (!tData) return interaction.reply({ content: "Ticket no encontrado.", ephemeral: true });
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
        return interaction.reply({ content: "Solo admins pueden aceptar.", ephemeral: true });

      tData.accepted = true;
      saveTickets();
      return interaction.reply({ content: "Ticket aceptado ✅", ephemeral: true });
    }

    // Cerrar ticket
    if (interaction.customId.startsWith("close_")) {
      const tId = interaction.customId.replace("close_", "");
      const tData = tickets[tId];
      if (!tData) return interaction.reply({ content: "Ticket no encontrado.", ephemeral: true });

      if (interaction.user.id !== tData.user && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator))
        return interaction.reply({ content: "Solo el creador o admins pueden cerrar.", ephemeral: true });

      const ch = await guild.channels.fetch(tData.channel).catch(() => null);
      if (ch) await ch.delete().catch(() => null);
      delete tickets[tId];
      saveTickets();
      return interaction.reply({ content: "Ticket cerrado ✅", ephemeral: true });
    }
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
KEEP ALIVE 24/7
===================== */
app.get("/ping", (_, res) => res.send("Gaburon activo 🛡️"));
setInterval(() => {
  const http = require("http");
  http.get(`http://localhost:${PORT}/ping`, res => console.log(`🔁 Ping keep-alive, status: ${res.statusCode}`))
    .on("error", err => console.log("❌ Error en keep-alive:", err.message));
}, 5 * 60 * 1000);

/* =====================
LOGIN
===================== */
client.login(TOKEN);
