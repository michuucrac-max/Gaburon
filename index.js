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
import http from "http";

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

const defaultConfig = {
  channels: {
    anuncios: null,
    castigos: null,
    bienvenidas: null,
    despedidas: null,
    alianzas: null,
    boost: null,
    tikets: { channelId: null, messageId: null },
    tops: null
  },
  counters: { users: null, bots: null }
};

let config = fs.existsSync(CONFIG_PATH) ? JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) : structuredClone(defaultConfig);
config = { ...defaultConfig, ...config };
config.channels = { ...defaultConfig.channels, ...(config.channels || {}) };
if (!config.channels.tikets) config.channels.tikets = { channelId: null, messageId: null };
const punishments = fs.existsSync(PUNISH_PATH) ? JSON.parse(fs.readFileSync(PUNISH_PATH, "utf8")) : [];
const saveConfig = () => fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

/* =====================
EXPRESS + KEEP-ALIVE
===================== */
const app = express();
app.get("/", (_, res) => res.send("Gaburon operativo. Ilblu permanece protegido."));
app.get("/ping", (_, res) => res.send("Gaburon activo 🛡️"));
app.listen(PORT, () => console.log(`🌐 Servidor activo en puerto ${PORT}`));
setInterval(() => {
  http.get(`http://localhost:${PORT}/ping`).on("error", () => {});
}, 5 * 60 * 1000);

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
    .addStringOption(o => o.setName("mensaje").setDescription("Mensaje").setRequired(true)),
  new SlashCommandBuilder()
    .setName("alianza")
    .setDescription("Registrar alianza")
    .addStringOption(o => o.setName("servidor").setDescription("Servidor").setRequired(true))
    .addStringOption(o => o.setName("descripcion").setDescription("Descripción").setRequired(true)),
  new SlashCommandBuilder()
    .setName("castigar")
    .setDescription("Ejecutar sentencia del Abismo")
    .addUserOption(o => o.setName("usuario").setDescription("Entidad").setRequired(true))
    .addStringOption(o =>
      o.setName("castigo").setDescription("Tipo de castigo").setRequired(true)
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
    .setDescription("Configurar canal de tickets")
    .addChannelOption(o => o.setName("canal").setDescription("Canal de tickets").setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  new SlashCommandBuilder()
    .setName("settoptop")
    .setDescription("Configurar canal de tops")
    .addChannelOption(o => o.setName("canal").setDescription("Canal de tops").setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  ...["anuncios", "castigos", "bienvenidas", "despedidas", "alianzas", "boost"].map(c =>
    new SlashCommandBuilder()
      .setName(`setchannel${c}`)
      .setDescription(`Configurar canal ${c}`)
      .addChannelOption(o => o.setName("canal").setDescription("Seleccionar canal").setRequired(true))
      .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
  ),
];

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
  setInterval(updateCounters, 5 * 60 * 1000);
  restoreTicketMessage();
  startAutoTops();
});

/* =====================
INTERACTIONS
===================== */
client.on(Events.InteractionCreate, async interaction => {
  try {
    if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

    // SET CHANNELS
    if (interaction.isChatInputCommand() && interaction.commandName.startsWith("setchannel")) {
      const tipo = interaction.commandName.replace("setchannel", "");
      const canal = interaction.options.getChannel("canal");
      if (!canal || canal.type !== ChannelType.GuildText)
        return interaction.reply({ content: "Canal inválido.", ephemeral: true });
      if (tipo === "tikets") {
        config.channels.tikets.channelId = canal.id;
        config.channels.tikets.messageId = null;
        await sendTicketBanner(canal);
      } else if (tipo === "toptop") {
        config.channels.tops = canal.id;
      } else {
        config.channels[tipo] = canal.id;
      }
      saveConfig();
      return interaction.reply({ content: `Canal ${tipo} configurado.`, ephemeral: true });
    }

    // ANUNCIO
    if (interaction.isChatInputCommand() && interaction.commandName === "anuncio") {
      const ch = interaction.guild.channels.cache.get(config.channels.anuncios);
      if (!ch) return interaction.reply({ content: "Canal no configurado.", ephemeral: true });
      try { 
        await ch.send({
          embeds: [new EmbedBuilder()
            .setTitle("📢 COMUNICADO DEL SISTEMA")
            .setDescription(interaction.options.getString("mensaje"))
            .setFooter({ text: "Emitido por GABURON" })
          ]
        });
      } catch(err) { console.error("Error enviando anuncio:", err); }
      return interaction.reply({ content: "Anuncio enviado.", ephemeral: true });
    }

    // ALIANZA
    if (interaction.isChatInputCommand() && interaction.commandName === "alianza") {
      const ch = interaction.guild.channels.cache.get(config.channels.alianzas);
      if (!ch) return interaction.reply({ content: "Canal no configurado.", ephemeral: true });
      try {
        await ch.send({
          content: "@everyone",
          embeds: [new EmbedBuilder()
            .setTitle("🔗 NUEVA ALIANZA")
            .addFields(
              { name: "Servidor", value: interaction.options.getString("servidor") },
              { name: "Descripción", value: interaction.options.getString("descripcion") }
            )
            .setFooter({ text: "Gaburon supervisa el pacto" })
          ]
        });
      } catch(err) { console.error("Error enviando alianza:", err); }
      return interaction.reply({ content: "Alianza registrada.", ephemeral: true });
    }

    // CASTIGAR
    if (interaction.isChatInputCommand() && interaction.commandName === "castigar") {
      await interaction.deferReply({ ephemeral: true });
      const user = interaction.options.getUser("usuario");
      const castigoId = interaction.options.getString("castigo");
      const data = punishments.find(p => p.id === castigoId);
      if (!data) return interaction.editReply("Castigo inexistente.");
      try {
        const member = await interaction.guild.members.fetch(user.id);
        if (data.action === "timeout") await member.timeout(data.duration, "Sentencia de Gaburon");
        if (data.action === "ban") await member.ban({ reason: "Sentencia absoluta de Gaburon" });
        const ch = interaction.guild.channels.cache.get(config.channels.castigos);
        if (ch) await ch.send(`⚠️ **SENTENCIA DEL ABISMO**\nEntidad: ${user}\nCastigo: **${data.nombre}**\nDescripción: ${data.descripcion}\nAutor: **GABURON**`);
      } catch(err) { console.error("Error aplicando castigo:", err); }
      return interaction.editReply(`Castigo aplicado: ${data.nombre}`);
    }

    // CREATE COUNTERS
    if (interaction.isChatInputCommand() && ["createhuman","createbot"].includes(interaction.commandName)) {
      const members = await interaction.guild.members.fetch();
      try {
        if (interaction.commandName === "createhuman") {
          const humans = members.filter(m => !m.user.bot).size;
          const ch = await interaction.guild.channels.create({
            name: `👤 Exploradores: ${humans}`,
            type: ChannelType.GuildVoice,
            permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionsBitField.Flags.Connect] }]
          });
          config.counters.users = ch.id; saveConfig();
          return interaction.reply({ content: "Contador humano creado.", ephemeral: true });
        }
        if (interaction.commandName === "createbot") {
          const bots = members.filter(m => m.user.bot).size;
          const ch = await interaction.guild.channels.create({
            name: `🤖 Unidades: ${bots}`,
            type: ChannelType.GuildVoice,
            permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionsBitField.Flags.Connect] }]
          });
          config.counters.bots = ch.id; saveConfig();
          return interaction.reply({ content: "Contador bot creado.", ephemeral: true });
        }
      } catch(err) { console.error("Error creando contador:", err); }
    }

    // BUTTONS (Tickets)
    if (interaction.isButton()) {
      const [action, type, userId] = interaction.customId.split("_");
      if (!interaction.guild) return;

      if (action === "openticket") {
        try {
          const member = await interaction.guild.members.fetch(userId||interaction.user.id);
          const ch = await interaction.guild.channels.create({
            name: `🎫-${member.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
              { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
              { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ]
          });
          const adminRoles = interaction.guild.roles.cache.filter(r=>r.permissions.has(PermissionsBitField.Flags.Administrator));
          for (const r of adminRoles.values()) await ch.permissionOverwrites.edit(r, { ViewChannel:true, SendMessages:true });
          const embed = new EmbedBuilder().setTitle("🎫 Ticket creado").setDescription("Tu ticket ha sido creado, espera que un administrador lo acepte.").setFooter({text:"Gaburon supervisa los tickets"});
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`acceptticket_${ch.id}`).setLabel("Aceptar ticket").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`closeticket_${ch.id}`).setLabel("Cerrar ticket").setStyle(ButtonStyle.Danger)
          );
          await ch.send({ content:`<@${member.id}>`, embeds:[embed], components:[row] });
          return interaction.reply({ content:`Ticket creado en ${ch}`, ephemeral:true });
        } catch(err){ console.error("Error creando ticket:",err); }
      }

      if (action === "acceptticket") {
        try {
          const ch = interaction.guild.channels.cache.get(type);
          if(!ch) return;
          await ch.send(`${interaction.user} ha aceptado este ticket.`);
          return interaction.reply({content:"Ticket aceptado.",ephemeral:true});
        } catch(err){ console.error("Error aceptando ticket:",err); }
      }

      if (action === "closeticket") {
        try {
          const ch = interaction.guild.channels.cache.get(type);
          if(!ch) return;
          await ch.delete();
          return interaction.reply({content:"Ticket cerrado.",ephemeral:true});
        } catch(err){ console.error("Error cerrando ticket:",err); }
      }
    }
  } catch(err){ console.error("Error en interactionCreate:",err); }
});

/* =====================
TICKETS HELPERS
===================== */
async function sendTicketBanner(channel){
  try{
    const embed = new EmbedBuilder()
      .setTitle("🎫 Sistema de Tickets")
      .setDescription("Selecciona el tipo de ticket que deseas abrir:")
      .addFields(
        {name:"Queja / Sugerencia",value:"Abre un ticket para enviar quejas o sugerencias."},
        {name:"Alianza",value:"Abre un ticket para registrar una alianza."},
        {name:"staff apply",value:"Abre un ticket para aplicar como staff del servidor."}
      ).setFooter({text:"Gaburon supervisa los tickets"});
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("openticket_general").setLabel("Abrir ticket").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("openticket_ally").setLabel("Abrir ticket ally").setStyle(ButtonStyle.Success)
    );
    const msg = await channel.send({embeds:[embed],components:[row]});
    config.channels.tikets.messageId = msg.id; saveConfig();
  }catch(err){console.error("Error enviando banner de tickets:",err);}
}

async function restoreTicketMessage(){
  try{
    if(!config.channels.tikets||!config.channels.tikets.channelId) return;
    const ch = await client.channels.fetch(config.channels.tikets.channelId).catch(()=>null);
    if(!ch) return;
    if(!config.channels.tikets.messageId) await sendTicketBanner(ch);
    else{
      try{ await ch.messages.fetch(config.channels.tikets.messageId); }
      catch{ await sendTicketBanner(ch); }
    }
  }catch(err){console.error("Error restaurando ticket message:",err);}
}

/* =====================
COUNTERS
===================== */
async function updateCounters(){
  for(const guild of client.guilds.cache.values()){
    try{
      const members = await guild.members.fetch();
      const humans = members.filter(m=>!m.user.bot).size;
      const bots = members.filter(m=>m.user.bot).size;
      if(config.counters.users){const ch=guild.channels.cache.get(config.counters.users);if(ch) await ch.setName(`👤 Exploradores: ${humans}`);}
      if(config.counters.bots){const ch=guild.channels.cache.get(config.counters.bots);if(ch) await ch.setName(`🤖 Unidades: ${bots}`);}
    }catch(err){console.error("Error actualizando contadores:",err);}
  }
}

/* =====================
BOOST / WELCOME / LEAVE
===================== */
client.on(Events.GuildMemberAdd, async m=>{
  try{
    const ch=m.guild.channels.cache.get(config.channels.bienvenidas);
    if(ch) await ch.send(`> ╂BIENVENIDA╂
> El explorador ${m} ha llegado a ${guild.name}. 
> Prepárate, tu descenso comienza aquí.  
> Que el Abismo guíe tus pasos y te proteja de lo que yace en sus capas. \nSistema: GABURON`);
  }catch(err){console.error("Error welcome:",err);}
});

client.on(Events.GuildMemberRemove, async m=>{
  try{
    const ch=m.guild.channels.cache.get(config.channels.despedidas);
    if(ch) await ch.send(`> ╂DESPEDIDA╂
> El explorador ${m.user.tag} ha abandonado la expedición.  
> Sus pasos quedarán registrados en las memorias del Abismo.  
> Que encuentres seguridad fuera de estas capas.\nSistema: GABURON`);
  }catch(err){console.error("Error leave:",err);}
});

client.on(Events.GuildMemberUpdate, async (oldM,newM)=>{
  try{
    if(!oldM.premiumSince && newM.premiumSince && config.channels.boost){
      const ch = await newM.guild.channels.fetch(config.channels.boost).catch(()=>null);
      if(ch) await ch.send(`> ╂IMPULSO╂
> ${newM} ha reforzado nuestra expedición con su energía.  
> La seguridad y organización del Abismo se fortalecen gracias a ti.  
> Que tu aporte ilumine incluso las profundidades más oscuras. \nIlblu ha sido fortalecido.`);
    }
  }catch(err){console.error("Error boost:",err);}
});

/* =====================
AUTOTOPS
===================== */
function startAutoTops(){
  setInterval(async ()=>{
    try{
      if(!config.channels.tops) return;
      const guild = client.guilds.cache.first();
      if(!guild) return;
      const members = await guild.members.fetch();
      const topUsers = members.filter(m=>!m.user.bot).map(m=>({tag:m.user.tag,id:m.id}));
      const embed = new EmbedBuilder()
        .setTitle("🏆 TOP ")
        .setDescription(topUsers.slice(0,10).map((u,i)=>`**${i+1}.** ${u.tag}`).join("\n"))
        .setFooter({text:"Gaburon supervisa los tops"});
      const ch = guild.channels.cache.get(config.channels.tops);
      if(ch) await ch.send({embeds:[embed]});
    }catch(err){console.error("Error auto tops:",err);}
  },10*60*1000);
}

/* =====================
LOGIN
===================== */
client.login(TOKEN).catch(err=>console.error("Error login Gaburon:",err));
