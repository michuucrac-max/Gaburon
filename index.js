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
  console.log(`Gaburon escuchando en puerto ${PORT}`)
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
  ]
});

/* =====================
SLASH COMMANDS
===================== */
const commands = [
  new SlashCommandBuilder()
    .setName("anunce")
    .setDescription("Transmitir mensaje oficial de Gaburon")
    .addStringOption(o =>
      o.setName("mensaje")
        .setDescription("Mensaje autorizado")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("castigar")
    .setDescription("Ejecutar sentencia del Abismo")
    .addUserOption(o =>
      o.setName("usuario")
        .setDescription("Entidad objetivo")
        .setRequired(true)
    )
    .addStringOption(o => {
      o.setName("castigo")
        .setDescription("Tipo de sentencia")
        .setRequired(true);

      if (punishments.length) {
        o.addChoices(
          ...punishments.map(p => ({
            name: p.nombre,
            value: p.id
          }))
        );
      } else {
        o.addChoices({ name: "Advertencia", value: "warn" });
      }
      return o;
    }),

  new SlashCommandBuilder()
    .setName("createuser")
    .setDescription("Crear contador de exploradores humanos")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  new SlashCommandBuilder()
    .setName("createbot")
    .setDescription("Crear contador de unidades mecánicas")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  new SlashCommandBuilder()
    .setName("setchannelaliance")
    .setDescription("Asignar canal de alianzas")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  new SlashCommandBuilder()
    .setName("setchannelboost")
    .setDescription("Asignar canal de refuerzos")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  ...["anuncios", "castigos", "bienvenidas", "despedidas"].map(c =>
    new SlashCommandBuilder()
      .setName(`setchannel${c}`)
      .setDescription(`Asignar canal de ${c}`)
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
    if (!interaction.customId.startsWith("set_")) return;

    const id = interaction.customId.replace("set_", "");
    config.channels[id] = interaction.values[0];
    saveConfig();

    return interaction.update({
      content: "Registro confirmado. Gaburon almacenó la ubicación.",
      components: []
    });
  }

  if (!interaction.isChatInputCommand()) return;

  /* ===== SET CHANNELS ===== */
  if (interaction.commandName.startsWith("setchannel")) {
    const id = interaction.commandName.replace("setchannel", "").toLowerCase();

    const menu = new ChannelSelectMenuBuilder()
      .setCustomId(`set_${id}`)
      .setPlaceholder("Seleccionar canal")
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
    const humans = members.filter(m => !m.user.bot).size;

    const ch = await interaction.guild.channels.create({
      name: `Exploradores: ${humans}`,
      type: ChannelType.GuildVoice,
      permissionOverwrites: [{
        id: interaction.guild.id,
        deny: [PermissionsBitField.Flags.Connect]
      }]
    });

    config.counters.users = ch.id;
    saveConfig();

    return interaction.editReply("Contador humano establecido.");
  }

  /* ===== CREATE BOT COUNTER ===== */
  if (interaction.commandName === "createbot") {
    await interaction.deferReply({ ephemeral: true });

    const members = await interaction.guild.members.fetch();
    const bots = members.filter(m => m.user.bot).size;

    const ch = await interaction.guild.channels.create({
      name: `Unidades: ${bots}`,
      type: ChannelType.GuildVoice,
      permissionOverwrites: [{
        id: interaction.guild.id,
        deny: [PermissionsBitField.Flags.Connect]
      }]
    });

    config.counters.bots = ch.id;
    saveConfig();

    return interaction.editReply("Contador mecánico establecido.");
  }

  /* ===== CASTIGAR (FIX REAL) ===== */
  if (interaction.commandName === "castigar") {
    await interaction.deferReply();

    const user = interaction.options.getUser("usuario");
    const castigo = interaction.options.getString("castigo");

    const msg =
      `**SENTENCIA DEL ABISMO**\n` +
      `Entidad: ${user}\n` +
      `Código: ${castigo}\n` +
      `Ejecución registrada por Gaburon.`;

    if (config.channels.castigos) {
      const ch = await interaction.guild.channels
        .fetch(config.channels.castigos)
        .catch(() => null);
      if (ch) await ch.send(msg);
    }

    return interaction.editReply(msg);
  }

  /* ===== ANNOUNCE ===== */
  if (interaction.commandName === "anunce") {
    const ch = await interaction.guild.channels
      .fetch(config.channels.anuncios)
      .catch(() => null);

    if (!ch)
      return interaction.reply({
        ephemeral: true,
        content: "Canal de anuncios no configurado."
      });

    await ch.send(
      `**TRANSMISIÓN OFICIAL — GABURON**\n` +
      interaction.options.getString("mensaje")
    );

    return interaction.reply({
      ephemeral: true,
      content: "Transmisión ejecutada."
    });
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
      if (ch) await ch.setName(`Exploradores: ${humans}`);
    }

    if (config.counters.bots) {
      const ch = guild.channels.cache.get(config.counters.bots);
      if (ch) await ch.setName(`Unidades: ${bots}`);
    }
  }
}

/* =====================
WELCOME / LEAVE
===================== */
client.on(Events.GuildMemberAdd, async member => {
  if (!config.channels.bienvenidas) return;

  const ch = await member.guild.channels
    .fetch(config.channels.bienvenidas)
    .catch(() => null);

  if (!ch) return;

  ch.send(
    `**ENTRADA REGISTRADA**\n` +
    `Entidad: ${member}\n` +
    `Estado: bajo vigilancia.\n` +
    `Gaburon protege Ilblu.`
  );
});

client.on(Events.GuildMemberRemove, async member => {
  if (!config.channels.despedidas) return;

  const ch = await member.guild.channels
    .fetch(config.channels.despedidas)
    .catch(() => null);

  if (!ch) return;

  ch.send(
    `**SALIDA REGISTRADA**\n` +
    `Entidad: ${member.user.tag}\n` +
    `Archivo cerrado por Gaburon.`
  );
});

/* =====================
BOOST
===================== */
client.on(Events.GuildMemberUpdate, async (oldM, newM) => {
  if (!oldM.premiumSince && newM.premiumSince && config.channels.boost) {
    const ch = await newM.guild.channels
      .fetch(config.channels.boost)
      .catch(() => null);

    if (!ch) return;

    ch.send(
      `**REFUERZO DETECTADO**\n` +
      `Unidad: ${newM}\n` +
      `Ilblu ha sido fortalecido.`
    );
  }
});

/* =====================
ALLIANCES
===================== */
client.on(Events.MessageCreate, async msg => {
  if (msg.author.bot) return;
  if (msg.channel.id !== config.channels.alianzas) return;

  const invite = /(discord\.gg\/|discord\.com\/invite\/)/i;
  if (!invite.test(msg.content)) return;

  msg.channel.send(
    `**PACTO INTER-ABISMO**\n` +
    `Origen: ${msg.author}\n` +
    `Estado: en evaluación.`
  );
});

/* =====================
READY
===================== */
client.once(Events.ClientReady, async () => {
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );

  console.log(`Gaburon en línea como ${client.user.tag}`);
  setInterval(updateCounters, 5 * 60 * 1000);
});

/* =====================
LOGIN
===================== */
client.login(TOKEN);
