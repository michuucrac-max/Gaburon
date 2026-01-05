import {
  Client,
  GatewayIntentBits,
  Events,
  PermissionsBitField,
  SlashCommandBuilder,
  REST,
  Routes,
  ActionRowBuilder,
  StringSelectMenuBuilder,
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
  : { channels: { anuncios: null, castigos: null, bienvenidas: null, despedidas: null } };

const punishments = JSON.parse(fs.readFileSync(PUNISH_PATH, "utf8"));

const saveConfig = () =>
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

/* =====================
EXPRESS
===================== */
const app = express();
app.get("/", (_, res) => res.send("🖤 Iru Guri observa en silencio"));
app.listen(PORT, () => console.log(`🌐 Iru Guri vivo en ${PORT}`));

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
    .setDescription("Enviar anuncio oficial")
    .addStringOption(o =>
      o.setName("mensaje").setDescription("Contenido del anuncio").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("castigar")
    .setDescription("Aplicar castigo canónico")
    .addUserOption(o => o.setName("usuario").setDescription("Objetivo").setRequired(true))
    .addStringOption(o =>
      o.setName("castigo")
        .setDescription("Tipo de castigo")
        .setRequired(true)
        .addChoices(
          ...punishments.map(p => ({ name: p.nombre, value: p.id }))
        )
    ),

  new SlashCommandBuilder()
    .setName("setchannelanunces")
    .setDescription("Configurar canal de anuncios")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  new SlashCommandBuilder()
    .setName("setchannelcastigos")
    .setDescription("Configurar canal de castigos")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  new SlashCommandBuilder()
    .setName("setchannelbienvenidas")
    .setDescription("Configurar canal de bienvenidas")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  new SlashCommandBuilder()
    .setName("setchanneldespedidas")
    .setDescription("Configurar canal de despedidas")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

/* =====================
INTERACTIONS
===================== */
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isChannelSelectMenu()) return;

  /* ===== SET CHANNELS ===== */
  if (interaction.isChatInputCommand() && interaction.commandName.startsWith("setchannel")) {
    const id = interaction.commandName.replace("setchannel", "").toLowerCase();
    const menu = new ChannelSelectMenuBuilder()
      .setCustomId(`set_${id}`)
      .setPlaceholder("Selecciona canal")
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
    if (id === "anunces") config.channels.anuncios = interaction.values[0];
    if (id === "castigos") config.channels.castigos = interaction.values[0];
    if (id === "bienvenidas") config.channels.bienvenidas = interaction.values[0];
    if (id === "despedidas") config.channels.despedidas = interaction.values[0];
    saveConfig();
    return interaction.update({ content: "📜 Canal configurado.", components: [] });
  }

  /* ===== ANUNCE ===== */
  if (interaction.isChatInputCommand() && interaction.commandName === "anunce") {
    const canal = config.channels.anuncios;
    if (!canal) return interaction.reply({ ephemeral: true, content: "❌ Canal no configurado." });
    const ch = await client.channels.fetch(canal).catch(() => null);
    if (!ch) return interaction.reply({ ephemeral: true, content: "❌ Canal inválido." });
    await ch.send(`> 📢 **ANUNCIO**\n> ${interaction.options.getString("mensaje")}`);
    return interaction.reply({ ephemeral: true, content: "✅ Anuncio enviado." });
  }

  /* ===== CASTIGOS ===== */
  if (interaction.isChatInputCommand() && interaction.commandName === "castigar") {
    const target = interaction.options.getUser("usuario");
    const castigoId = interaction.options.getString("castigo");
    const rule = punishments.find(p => p.id === castigoId);
    if (!rule) return interaction.reply({ ephemeral: true, content: "❌ Castigo inválido." });

    const member = await interaction.guild.members.fetch(target.id);
    const canal = config.channels.castigos;
    if (canal) {
      const ch = await client.channels.fetch(canal).catch(() => null);
      if (ch) {
        await ch.send(
          `> ⚖️ **CASTIGO APLICADO**\n` +
          `> Explorador: ${member}\n` +
          `> Castigo: **${rule.nombre}**\n` +
          `> Descripción: ${rule.descripcion}`
        );
      }
    }

    if (rule.action === "timeout") {
      await member.timeout(rule.duration, "Castigo del Abismo");
    }

    if (rule.action === "ban") {
      await member.ban({ reason: "Lanzado al Abismo" });
    }

    return interaction.reply({ ephemeral: true, content: "🖤 Castigo ejecutado." });
  }
});

/* =====================
WELCOME / LEAVE
===================== */
client.on(Events.GuildMemberAdd, async member => {
  const canal = config.channels.bienvenidas;
  if (!canal) return;
  const ch = await member.guild.channels.fetch(canal).catch(() => null);
  if (!ch) return;
  await ch.send(`> 👁️ ¡Atención! ${member} ha descendido al Abismo. Prepárense, su viaje apenas comienza…
> 🧭 Que la fortuna lo acompañe en cada piso.`);
});

client.on(Events.GuildMemberRemove, async member => {
  const canal = config.channels.despedidas;
  if (!canal) return;
  const ch = await member.guild.channels.fetch(canal).catch(() => null);
  if (!ch) return;
  await ch.send(`> 🌑 La oscuridad del Abismo se traga a ${member.user.tag}. Sus pasos ya no resonarán entre nosotros… que los ecos lo recuerden.`);
});

/* =====================
READY
===================== */
client.once(Events.ClientReady, async () => {
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log(`🖤 Iru Guri despierto como ${client.user.tag}`);
});

/* =====================
LOGIN
===================== */
client.login(TOKEN);
