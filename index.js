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

const config = fs.existsSync(CONFIG_PATH)
  ? JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"))
  : {
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

const punishments = JSON.parse(fs.readFileSync(PUNISH_PATH, "utf8"));
const saveConfig = () =>
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

/* =====================
EXPRESS
===================== */
const app = express();
app.get("/", (_, res) =>
  res.send(" Gaburon permanece inmóvil, vigilando Ilblu y a la Princesa Faputa")
);
app.listen(PORT, () => console.log(`🌐 Gaburon activo en ${PORT}`));

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
    .setDescription("Proclamar un mensaje de Gaburon")
    .addStringOption(o =>
      o.setName("mensaje").setDescription("Mensaje del guardián").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("castigar")
    .setDescription("Aplicar juicio del Abismo")
    .addUserOption(o => o.setName("usuario").setDescription("Objetivo").setRequired(true))
    .addStringOption(o =>
      o.setName("castigo")
        .setDescription("Sentencia")
        .setRequired(true)
        .addChoices(...punishments.map(p => ({ name: p.nombre, value: p.id })))
    ),

  new SlashCommandBuilder()
    .setName("createuser")
    .setDescription("Erigir tótem de conteo de humanos")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  new SlashCommandBuilder()
    .setName("createbot")
    .setDescription("Erigir tótem de conteo de autómatas")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  new SlashCommandBuilder()
    .setName("setchannelaliance")
    .setDescription("Designar zona de pactos entre Abismos")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  new SlashCommandBuilder()
    .setName("setchannelboost")
    .setDescription("Designar altar de ofrendas (boosts)")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  ...["anunces", "castigos", "bienvenidas", "despedidas"].map(c =>
    new SlashCommandBuilder()
      .setName(`setchannel${c}`)
      .setDescription(`Designar canal de ${c}`)
      .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
  )
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

/* =====================
INTERACTIONS
===================== */
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isChannelSelectMenu()) return;

  if (interaction.isChatInputCommand() && interaction.commandName.startsWith("setchannel")) {
    const id = interaction.commandName.replace("setchannel", "").toLowerCase();

    const menu = new ChannelSelectMenuBuilder()
      .setCustomId(`set_${id}`)
      .setPlaceholder("Gaburon espera una designación")
      .addChannelTypes(ChannelType.GuildText)
      .setMinValues(1)
      .setMaxValues(1);

    return interaction.reply({
      ephemeral: true,
      components: [new ActionRowBuilder().addComponents(menu)]
    });
  }

  if (interaction.isChannelSelectMenu() && interaction.customId.startsWith("set_")) {
    const id = interaction.customId.replace("set_", "");
    config.channels[id] = interaction.values[0];
    saveConfig();
    return interaction.update({ content: "🦴 Gaburon ha memorizado el lugar.", components: [] });
  }

  if (interaction.commandName === "createuser") {
    const ch = await interaction.guild.channels.create({
      name: `👁️ Humanos: ${interaction.guild.memberCount}`,
      type: ChannelType.GuildVoice,
      permissionOverwrites: [{
        id: interaction.guild.id,
        deny: [PermissionsBitField.Flags.Connect]
      }]
    });
    config.counters.users = ch.id;
    saveConfig();
    return interaction.reply({ ephemeral: true, content: "🦴 Tótem humano erigido." });
  }

  if (interaction.commandName === "createbot") {
    const bots = interaction.guild.members.cache.filter(m => m.user.bot).size;
    const ch = await interaction.guild.channels.create({
      name: `⚙️ Autómatas: ${bots}`,
      type: ChannelType.GuildVoice,
      permissionOverwrites: [{
        id: interaction.guild.id,
        deny: [PermissionsBitField.Flags.Connect]
      }]
    });
    config.counters.bots = ch.id;
    saveConfig();
    return interaction.reply({ ephemeral: true, content: "🦴 Tótem mecánico erigido." });
  }
});

/* =====================
COUNTERS
===================== */
async function updateCounters() {
  for (const guild of client.guilds.cache.values()) {
    const members = await guild.members.fetch();
    const bots = members.filter(m => m.user.bot).size;

    if (config.counters.users) {
      const ch = guild.channels.cache.get(config.counters.users);
      if (ch) ch.setName(`👁️ Humanos: ${members.size}`);
    }

    if (config.counters.bots) {
      const ch = guild.channels.cache.get(config.counters.bots);
      if (ch) ch.setName(`⚙️ Autómatas: ${bots}`);
    }
  }
}

/* =====================
BOOST – GABURON
===================== */
client.on(Events.GuildMemberUpdate, async (oldM, newM) => {
  if (!oldM.premiumSince && newM.premiumSince) {
    if (!config.channels.boost) return;
    const ch = await newM.guild.channels.fetch(config.channels.boost).catch(() => null);
    if (!ch) return;

    ch.send(
      `>  **GABURON DESPIERTA**\n` +
      `> La ofrenda ha sido aceptada.\n` +
      `> ${newM} ha fortalecido Ilblu y a su Princesa.\n` +
      `> Mientras Gaburon permanezca en pie, Faputa estará a salvo.\n` +
      `>  El Abismo recuerda este acto.`
    );
  }
});

/* =====================
ALLIANCE DETECTION
===================== */
client.on(Events.MessageCreate, async msg => {
  if (msg.author.bot) return;
  if (msg.channel.id !== config.channels.alianzas) return;

  const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/)/i;
  if (!inviteRegex.test(msg.content)) return;

  msg.channel.send(
    `> 🤝 **PACTO DETECTADO**\n` +
    `> Gaburon ha identificado un portal hacia otro Abismo.\n` +
    `> Explorador: ${msg.author}\n` +
    `> Ilblu observa.`
  );
});

/* =====================
WELCOME / LEAVE
===================== */
client.on(Events.GuildMemberAdd, async member => {
  const ch = config.channels.bienvenidas
    ? await member.guild.channels.fetch(config.channels.bienvenidas).catch(() => null)
    : null;

  if (ch)
    ch.send(
      `> 👁️ Gaburon gira su mirada.\n` +
      `> ${member} ha entrado en territorio protegido.\n` +
      `> Faputa decide su valor.`
    );
});

client.on(Events.GuildMemberRemove, async member => {
  const ch = config.channels.despedidas
    ? await member.guild.channels.fetch(config.channels.despedidas).catch(() => null)
    : null;

  if (ch)
    ch.send(
      `> 🌑 Gaburon no interfiere.\n` +
      `> ${member.user.tag} se ha perdido en el Abismo.\n` +
      `> El eco se apaga.`
    );
});

/* =====================
READY
===================== */
client.once(Events.ClientReady, async () => {
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log(` Gaburon despierto como ${client.user.tag}`);
  setInterval(updateCounters, 5 * 60 * 1000);
});

/* =====================
LOGIN
===================== */
client.login(TOKEN);
