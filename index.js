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

  /* ===== CASTIGAR (FIX REAL) ===== */
  if (interaction.commandName === "castigar") {
    await interaction.deferReply();

    const user = interaction.options.getUser("usuario");
    const castigo = interaction.options.getString("castigo");

    const ch = config.channels.castigos
      ? await interaction.guild.channels.fetch(config.channels.castigos).catch(() => null)
      : null;

    const msg =
      `**SENTENCIA DEL ABISMO**\n` +
      `Entidad: ${user}\n` +
      `Código: ${castigo}\n` +
      `Ejecución registrada por Gaburon.`;

    if (ch) await ch.send(msg);

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
READY
===================== */
client.once(Events.ClientReady, async () => {
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log(`Gaburon en línea como ${client.user.tag}`);
});

/* =====================
LOGIN
===================== */
client.login(TOKEN);
