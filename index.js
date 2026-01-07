// ================= IMPORTS =================
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ChannelType,
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");
require("dotenv").config();

// ================= FILES =================
const CONFIG_PATH = "./config.json";
const PUNISH_PATH = "./punishments.json";

// ================= DEFAULT CONFIG =================
const defaultConfig = {
  token: process.env.TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || null,

  channels: {
    anuncios: null,
    alianzas: null,
    castigos: null,
    welcome: null,
    despedida: null,
    boost: null
  },

  counters: {
    humans: null,
    bots: null
  }
};

if (!fs.existsSync(CONFIG_PATH)) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const punishments = JSON.parse(fs.readFileSync(PUNISH_PATH, "utf8"));

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// ================= SLASH COMMANDS =================
const commands = [

  new SlashCommandBuilder()
    .setName("setchannelanuncios")
    .setDescription("Asignar canal de anuncios")
    .addChannelOption(o =>
      o.setName("canal").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("setchannelalianzas")
    .setDescription("Asignar canal de alianzas")
    .addChannelOption(o =>
      o.setName("canal").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("setchannelcastigos")
    .setDescription("Asignar canal de castigos")
    .addChannelOption(o =>
      o.setName("canal").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("setchannelwelcome")
    .setDescription("Asignar canal de bienvenidas")
    .addChannelOption(o =>
      o.setName("canal").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("setchanneldespedida")
    .setDescription("Asignar canal de despedidas")
    .addChannelOption(o =>
      o.setName("canal").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("setchannelboost")
    .setDescription("Asignar canal de boosts")
    .addChannelOption(o =>
      o.setName("canal").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("anuncio")
    .setDescription("Enviar anuncio oficial de Gaburon")
    .addStringOption(o =>
      o.setName("mensaje").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("alianza")
    .setDescription("Registrar alianza")
    .addStringOption(o =>
      o.setName("servidor").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("descripcion").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("castigar")
    .setDescription("Ejecutar castigo del Abismo")
    .addUserOption(o =>
      o.setName("usuario").setRequired(true)
    )
    .addStringOption(o => {
      o.setName("castigo").setRequired(true);
      punishments.forEach(p =>
        o.addChoices({ name: p.nombre, value: p.id })
      );
      return o;
    }),

  new SlashCommandBuilder()
    .setName("createhuman")
    .setDescription("Crear contador de humanos"),

  new SlashCommandBuilder()
    .setName("createbot")
    .setDescription("Crear contador de bots")
];

// ================= REGISTER COMMANDS =================
const rest = new REST({ version: "10" }).setToken(config.token);

client.once(Events.ClientReady, async () => {
  if (config.guildId) {
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    );
  } else {
    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands }
    );
  }

  console.log(`🛡️ Gaburon activo como ${client.user.tag}`);
  setInterval(updateCounters, 5 * 60 * 1000);
});

// ================= INTERACTIONS =================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const name = interaction.commandName;

  if (name.startsWith("setchannel")) {
    const canal = interaction.options.getChannel("canal");
    const key = name.replace("setchannel", "");
    config.channels[key] = canal.id;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    return interaction.reply({ content: "Canal asignado.", ephemeral: true });
  }

  if (name === "anuncio") {
    const ch = interaction.guild.channels.cache.get(config.channels.anuncios);
    if (!ch) return interaction.reply({ content: "Canal no configurado.", ephemeral: true });

    await ch.send({
      embeds: [new EmbedBuilder()
        .setTitle("📢 COMUNICADO DE GABURON")
        .setDescription(interaction.options.getString("mensaje"))
        .setColor(0x555555)
      ]
    });
    return interaction.reply({ content: "Anuncio enviado.", ephemeral: true });
  }

  if (name === "alianza") {
    const ch = interaction.guild.channels.cache.get(config.channels.alianzas);
    if (!ch) return interaction.reply({ content: "Canal no configurado.", ephemeral: true });

    await ch.send({
      content: "@everyone",
      embeds: [new EmbedBuilder()
        .setTitle("🔗 NUEVA ALIANZA")
        .addFields(
          { name: "Servidor", value: interaction.options.getString("servidor") },
          { name: "Descripción", value: interaction.options.getString("descripcion") }
        )
        .setFooter({ text: "Sistema Gaburon" })
      ]
    });
    return interaction.reply({ content: "Alianza publicada.", ephemeral: true });
  }

  if (name === "createhuman" || name === "createbot") {
    const members = await interaction.guild.members.fetch();
    const count = name === "createhuman"
      ? members.filter(m => !m.user.bot).size
      : members.filter(m => m.user.bot).size;

    const channel = await interaction.guild.channels.create({
      name: `${name === "createhuman" ? "Exploradores" : "Unidades"}: ${count}`,
      type: ChannelType.GuildVoice,
      permissionOverwrites: [{
        id: interaction.guild.id,
        deny: [PermissionsBitField.Flags.Connect]
      }]
    });

    config.counters[name === "createhuman" ? "humans" : "bots"] = channel.id;
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

    return interaction.reply({ content: "Contador creado.", ephemeral: true });
  }

  if (name === "castigar") {
    await interaction.deferReply({ ephemeral: true });
    const user = interaction.options.getUser("usuario");
    const data = punishments.find(p => p.id === interaction.options.getString("castigo"));
    const member = await interaction.guild.members.fetch(user.id);

    if (data.action === "timeout") {
      await member.timeout(data.duration, "Sentencia de Gaburon");
    }
    if (data.action === "ban") {
      await member.ban({ reason: "Sentencia absoluta de Gaburon" });
    }

    const ch = interaction.guild.channels.cache.get(config.channels.castigos);
    if (ch) {
      ch.send(`⚠ **CASTIGO EJECUTADO**\nEntidad: ${user}\nCastigo: ${data.nombre}\nAutor: GABURON`);
    }

    return interaction.editReply("Castigo aplicado.");
  }
});

// ================= COUNTERS =================
async function updateCounters() {
  for (const guild of client.guilds.cache.values()) {
    const members = await guild.members.fetch();

    if (config.counters.humans) {
      const ch = guild.channels.cache.get(config.counters.humans);
      if (ch) await ch.setName(`Exploradores: ${members.filter(m => !m.user.bot).size}`);
    }

    if (config.counters.bots) {
      const ch = guild.channels.cache.get(config.counters.bots);
      if (ch) await ch.setName(`Unidades: ${members.filter(m => m.user.bot).size}`);
    }
  }
}

// ================= LOGIN =================
client.login(config.token);
