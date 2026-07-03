/* ==========================
          IMPORTS
========================== */
import fs from "fs";
import {
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

/* ==========================
           RUTAS
========================== */
const CONFIG_PATH = "./config.json";

/* ==========================
           CONFIG
========================== */
let config = { channels: {}, counters: {} };
loadConfig();

/* ==========================
        CONFIG.JSON
========================== */
function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    saveConfig();
    return;
  }
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    console.log("⚠️ config.json corrupto. Restaurando...");
    config = { channels: {}, counters: {} };
    saveConfig();
  }
  config.channels ??= {};
  config.counters ??= {};
}
function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 4), "utf8");
    console.log("✅ config.json guardado correctamente");
  } catch (err) {
    console.error("❌ Error guardando config.json:", err);
  }
}

/* ==========================
       FUNCIONES AUXILIARES
========================== */
function placeholder(interaction, text) {
  return interaction.reply({ content: text, ephemeral: true });
}

/* ==========================
   Helpers de plantillas
   - Soporta {user}, {username}, {server}, {avatar}, {banner}
   - Acepta como segundo parámetro un Member o un objeto replacements
========================== */
function formatTemplate(template, memberOrReplacements) {
  if (!template) return "";

  // Construir objeto replacements
  let replacements = {};
  if (!memberOrReplacements) {
    replacements = {};
  } else if (memberOrReplacements && memberOrReplacements.id && memberOrReplacements.user) {
    // Es un GuildMember
    const member = memberOrReplacements;
    replacements = {
      user: `<@${member.id}>`,
      username: member.user.username,
      server: member.guild?.name ?? "",
      avatar: member.user.displayAvatarURL ? member.user.displayAvatarURL({ extension: "png", size: 1024 }) : "",
      banner: "" // banner se puede rellenar externamente si se obtuvo
    };
  } else {
    // Es un objeto con keys
    replacements = { ...memberOrReplacements };
  }

  let out = template;
  // Reemplazos seguros (si no existe la key, se reemplaza por cadena vacía)
  out = out.replaceAll("{user}", replacements.user ?? "");
  out = out.replaceAll("{username}", replacements.username ?? "");
  out = out.replaceAll("{server}", replacements.server ?? "");
  out = out.replaceAll("{avatar}", replacements.avatar ?? "");
  out = out.replaceAll("{banner}", replacements.banner ?? "");
  return out;
}

/* ==========================
   Función: sendWelcome (banner personalizado y botón URL)
========================== */
export async function sendWelcome(member) {
  try {
    console.log(`[welcome] trigger guild=${member.guild?.id} user=${member.id}`);

    const guildCfg = config.channels?.[member.guild.id] ?? {};
    const channelId = guildCfg.bienvenidas;
    const templateRaw = guildCfg.bienvenidasMessage ?? "Bienvenido {user} a **{server}**";
    const bannerUrl = guildCfg.bienvenidasBanner ?? null; // banner personalizado
    const url = guildCfg.bienvenidasUrl ?? null;          // botón opcional

    if (!channelId) {
      console.log("[welcome] no channel configured");
      return;
    }

    const channel = await member.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      console.log("[welcome] channel fetch failed:", channelId);
      return;
    }

    const avatarUrl = member.user.displayAvatarURL({ extension: "png", size: 1024 }) ?? null;

    // Reemplazos: {banner} no mete URL en el texto
    const replacements = {
      user: `<@${member.id}>`,
      username: member.user.username,
      server: member.guild.name,
      avatar: avatarUrl ?? "",
      banner: "" // vacío para no meter links en el texto
    };
    const content = formatTemplate(templateRaw, replacements);

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle(`¡Bienvenido ${member.user.username}!`)
      .setDescription(content)
      .setThumbnail(avatarUrl)
      .setTimestamp()
      .setFooter({ text: `${member.guild.name} • ¡Disfruta!` });

    // Si el mensaje incluye {banner} y hay bannerUrl configurado, mostrarlo como imagen grande
    if (templateRaw.includes("{banner}") && bannerUrl) {
      embed.setImage(bannerUrl);
    } else if (avatarUrl) {
      embed.setImage(avatarUrl);
    }

    const components = [];
    if (url && /^https?:\/\//i.test(url)) {
      components.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel("Ir al enlace").setStyle(ButtonStyle.Link).setURL(url)
      ));
    }

    await channel.send({ embeds: [embed], components });
    console.log("[welcome] sent to", channelId);
  } catch (err) {
    console.error("sendWelcome error:", err);
  }
}

export async function sendFarewell(member) {
  try {
    console.log(`[farewell] trigger guild=${member.guild?.id} user=${member.id}`);
    const guildCfg = config.channels?.[member.guild.id] ?? {};
    const channelId = guildCfg.despedidas;
    const templateRaw = guildCfg.despedidasMessage ?? "Adiós {user}, gracias por estar en **{server}**";
    const bannerUrl = guildCfg.despedidasBanner ?? null;
    const url = guildCfg.despedidasUrl ?? null;

    if (!channelId) return;
    const channel = await member.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    const avatarUrl = member.user.displayAvatarURL({ extension: "png", size: 1024 }) ?? null;

    const replacements = {
      user: `<@${member.id}>`,
      username: member.user.username,
      server: member.guild.name,
      avatar: avatarUrl ?? "",
      banner: "" // no insertamos URL en texto
    };
    const content = formatTemplate(templateRaw, replacements);

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle("Despedida")
      .setDescription(content)
      .setThumbnail(avatarUrl)
      .setTimestamp()
      .setFooter({ text: `${member.guild.name} • Hasta luego` });

    if (templateRaw.includes("{banner}") && bannerUrl) embed.setImage(bannerUrl);
    else if (avatarUrl) embed.setImage(avatarUrl);

    const components = [];
    if (url && /^https?:\/\//i.test(url)) {
      components.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel("Ver más").setStyle(ButtonStyle.Link).setURL(url)
      ));
    }

    await channel.send({ embeds: [embed], components });
    console.log("[farewell] sent to", channelId);
  } catch (err) {
    console.error("sendFarewell error:", err);
  }
}

export async function handleBoost(oldMember, newMember) {
  try {
    const oldPremium = oldMember?.premiumSince ?? null;
    const newPremium = newMember?.premiumSince ?? null;

    console.log(`[boost] guild=${newMember.guild?.id} user=${newMember.id} oldPremium=${oldPremium} newPremium=${newPremium}`);

    if (!oldPremium && newPremium) {
      const guildCfg = config.channels?.[newMember.guild.id] ?? {};
      const channelId = guildCfg.boost;
      const templateRaw = guildCfg.boostMessage ?? "{user} ha dado boost al servidor. ¡Gracias!";
      const bannerUrl = guildCfg.boostBanner ?? null;
      const url = guildCfg.boostUrl ?? null;

      if (!channelId) return;
      const channel = await newMember.guild.channels.fetch(channelId).catch(() => null);
      if (!channel) return;

      const avatarUrl = newMember.user.displayAvatarURL({ extension: "png", size: 1024 }) ?? null;

      const replacements = {
        user: `<@${newMember.id}>`,
        username: newMember.user.username,
        server: newMember.guild.name,
        avatar: avatarUrl ?? "",
        banner: "" // no insertamos URL en texto
      };
      const content = formatTemplate(templateRaw, replacements);

      const embed = new EmbedBuilder()
        .setColor(0xFAA61A)
        .setTitle("¡Nuevo Boost!")
        .setDescription(content)
        .setThumbnail(avatarUrl)
        .setTimestamp();

      if (templateRaw.includes("{banner}") && bannerUrl) embed.setImage(bannerUrl);
      else if (avatarUrl) embed.setImage(avatarUrl);

      const components = [];
      if (url && /^https?:\/\//i.test(url)) {
        components.push(new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel("Ver más").setStyle(ButtonStyle.Link).setURL(url)
        ));
      }

      await channel.send({ embeds: [embed], components });
      console.log("[boost] sent to", channelId);
    }
  } catch (err) {
    console.error("handleBoost error:", err);
  }
}

/* ==========================
   FUNCIONES DE CONTADORES (MULTI-GUILD)
========================== */
/**
 * ensureCounterChannel(guild, key, label, count)
 * - key: "humans" o "bots"
 * - label: "👤 Humanos" o "🤖 Bots"
 * - count: número actual
 *
 * Guarda por guild: config.counters[guild.id] = { humans: id, bots: id }
 */
async function ensureCounterChannel(guild, key, label, count) {
  try {
    // Asegurar estructura por guild
    config.counters ??= {};
    config.counters[guild.id] ??= { humans: null, bots: null };

    // savedId por guild
    const savedId = config.counters[guild.id][key];

    // 1) Intentar fetch por ID guardado (comprobación real)
    let ch = null;
    if (savedId) {
      try {
        ch = await guild.channels.fetch(savedId);
      } catch {
        ch = null;
      }
    }

    // 2) Buscar o crear categoría "Status"
    let category = guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === "status"
    );
    if (!category) {
      try {
        category = await guild.channels.create({ name: "Status", type: ChannelType.GuildCategory });
        console.log(`Categoria Status creada en guild ${guild.id} (${category.id})`);
      } catch (err) {
        console.error("Error creando categoría Status:", err);
      }
    }

    // 3) Si no existe por ID, intentar encontrar un canal existente en la categoría con el prefijo label
    if (!ch && category) {
      const possible = guild.channels.cache
        .filter(c => c.parentId === category.id && c.type === ChannelType.GuildVoice && c.name.startsWith(label))
        .first();
      if (possible) {
        ch = possible;
        config.counters[guild.id][key] = ch.id;
        saveConfig();
        console.log(`Reutilizando canal existente para ${key} en guild ${guild.id}: ${ch.id}`);
      }
    }

    // 4) Si sigue sin existir, crear y guardar
    if (!ch) {
      try {
        ch = await guild.channels.create({
          name: `${label}: ${count}`,
          type: ChannelType.GuildVoice,
          parent: category ? category.id : undefined,
          permissionOverwrites: [
            { id: guild.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.Connect] }
          ]
        });
        config.counters[guild.id][key] = ch.id;
        saveConfig();
        console.log(`Canal contador creado para ${key} en guild ${guild.id}: ${ch.id}`);
        return;
      } catch (err) {
        console.error("Error creando canal contador:", err);
        return;
      }
    }

    // 5) Si existe, renombrar con el nuevo conteo
    try {
      await ch.setName(`${label}: ${count}`);
      console.log(`Canal ${key} renombrado en guild ${guild.id}: ${ch.id} -> ${label}: ${count}`);
    } catch (err) {
      console.error("Error renombrando canal contador:", err);
    }
  } catch (err) {
    console.error("ensureCounterChannel error:", err);
  }
}

/* ==========================
           LÓGICA
========================== */
export async function executeLogic(interaction, client) {
  if (interaction.isButton()) return handleButtons(interaction);
  if (!interaction.isChatInputCommand()) return;
  return handleSlashCommands(interaction, client);
}

/* ==========================
          BOTONES
========================== */
async function handleButtons(interaction) {
  switch (interaction.customId) {
    case "ticket_create": {
      let category = interaction.guild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === "administracion"
      );
      if (!category) {
        category = await interaction.guild.channels.create({
          name: "Administracion",
          type: ChannelType.GuildCategory
        });
      }

      const ticketChannel = await interaction.guild.channels.create({
        name: `🎫 ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("🎫 Ticket creado")
        .setDescription("Un administrador revisará tu caso pronto.");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("ticket_accept").setLabel("Aceptar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("ticket_reject").setLabel("Rechazar").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("ticket_close").setLabel("Cerrar").setStyle(ButtonStyle.Secondary)
      );

      await ticketChannel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: `✅ Ticket creado en <#${ticketChannel.id}>`, ephemeral: true });
      break;
    }

    case "ticket_accept":
      return interaction.reply({ content: "✅ Ticket aceptado.", ephemeral: true });

    case "ticket_reject":
    case "ticket_close":
      await interaction.channel.delete().catch(() => {});
      break;

    default:
      return interaction.reply({ content: "❌ Botón desconocido.", ephemeral: true });
  }
}

/* ==========================
      SLASH COMMANDS
========================== */
async function handleSlashCommands(interaction, client) {
  console.log("Comando recibido:", interaction.commandName);

  switch (interaction.commandName) {
    case "anuncio": {
      const mensaje = interaction.options.getString("mensaje");
      const canalId = config.channels?.[interaction.guild.id]?.anuncios;
      if (!canalId) return placeholder(interaction, "📢 No hay canal de anuncios configurado.");
      const canal = interaction.guild.channels.cache.get(canalId);
      await canal.send(`📢 **Anuncio oficial:**\n${mensaje}`);
      return interaction.reply({ content: "✅ Anuncio enviado.", ephemeral: true });
    }

    case "alianza": {
      const servidor = interaction.options.getString("servidor");
      const descripcion = interaction.options.getString("descripcion");
      const canalId = config.channels?.[interaction.guild.id]?.alianzas;
      if (!canalId) return placeholder(interaction, "🤝 No hay canal de alianzas configurado.");
      const canal = interaction.guild.channels.cache.get(canalId);
      await canal.send(`🤝 Nueva alianza con **${servidor}**\n${descripcion}`);
      return interaction.reply({ content: "✅ Alianza registrada.", ephemeral: true });
    }

    case "castigar": {
      const usuario = interaction.options.getUser("usuario");
      const castigo = interaction.options.getString("castigo");
      const canalId = config.channels?.[interaction.guild.id]?.castigos;
      if (!canalId) return placeholder(interaction, "⚠️ No hay canal de castigos configurado.");
      const canal = interaction.guild.channels.cache.get(canalId);
      await canal.send(`⚠️ Sentencia aplicada a ${usuario}: ${castigo}`);
      return interaction.reply({ content: "✅ Castigo ejecutado.", ephemeral: true });
    }

    case "infosetchannels": {
      // Solo admins
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "❌ Solo administradores pueden usar este comando.", ephemeral: true });
      }

      const guildCfg = config.channels?.[interaction.guild.id] ?? {};

      const lines = [
        "📑 **Información de configuración de canales**",
        "",
        `📢 Anuncios: ${guildCfg.anuncios ? `<#${guildCfg.anuncios}>` : "No configurado"}`,
        `⚠️ Castigos: ${guildCfg.castigos ? `<#${guildCfg.castigos}>` : "No configurado"}`,
        `👋 Bienvenidas: ${guildCfg.bienvenidas ? `<#${guildCfg.bienvenidas}>` : "No configurado"}`,
        `👋 Mensaje Bienvenida: ${guildCfg.bienvenidasMessage ?? "Por defecto"}`,
        `👋 URL Bienvenida: ${guildCfg.bienvenidasUrl ?? "No configurada"}`,
        `🚪 Despedidas: ${guildCfg.despedidas ? `<#${guildCfg.despedidas}>` : "No configurado"}`,
        `🚪 Mensaje Despedida: ${guildCfg.despedidasMessage ?? "Por defecto"}`,
        `🚪 URL Despedida: ${guildCfg.despedidasUrl ?? "No configurada"}`,
        `💎 Boost: ${guildCfg.boost ? `<#${guildCfg.boost}>` : "No configurado"}`,
        `💎 Mensaje Boost: ${guildCfg.boostMessage ?? "Por defecto"}`,
        `💎 URL Boost: ${guildCfg.boostUrl ?? "No configurada"}`,
        "",
        "🛠️ **Cómo usar los comandos /setchannel...**",
        "- `/setchannelbienvenidas canal:#canal mensaje:\"Texto con {user}, {username}, {server}, {banner}, {avatar}\" url:\"https://...\"`",
        "- `/setchanneldespedidas canal:#canal mensaje:\"Texto con {user}, {username}, {server}, {banner}, {avatar}\" url:\"https://...\"`",
        "- `/setchannelboost canal:#canal mensaje:\"Texto con {user}, {username}, {server}, {banner}, {avatar}\" url:\"https://...\"`",
        "",
        "👉 Placeholders disponibles:",
        "- `{user}` → Menciona al usuario",
        "- `{username}` → Nombre del usuario",
        "- `{server}` → Nombre del servidor",
        "- `{avatar}` → URL del avatar del usuario",
        "- `{banner}` → URL del banner del usuario (si tiene)"
      ];

      return interaction.reply({ content: lines.join("\n"), ephemeral: true });
    }

    case "createhuman": {
      const members = await interaction.guild.members.fetch();
      const humans = members.filter(m => !m.user.bot).size;

      await ensureCounterChannel(interaction.guild, "humans", "👤 Humanos", humans);

      return interaction.reply({ content: "✅ Contador de humanos creado/actualizado.", ephemeral: true });
    }

    case "createbot": {
      const members = await interaction.guild.members.fetch();
      const bots = members.filter(m => m.user.bot).size;

      await ensureCounterChannel(interaction.guild, "bots", "🤖 Bots", bots);

      return interaction.reply({ content: "✅ Contador de bots creado/actualizado.", ephemeral: true });
    }

    case "settoptop":
      config.channels[interaction.guild.id] ??= {};
      config.channels[interaction.guild.id].tops = interaction.options.getChannel("canal").id;
      saveConfig();
      return interaction.reply({ content: "✅ Canal de tops configurado.", ephemeral: true });

    case "setchannelanuncios": {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "❌ Solo administradores pueden usar este comando.", ephemeral: true });
      }
      const canal = interaction.options.getChannel("canal");
      config.channels[interaction.guild.id] ??= {};
      config.channels[interaction.guild.id].anuncios = canal.id;
      saveConfig();
      return interaction.reply({ content: "✅ Canal de anuncios configurado.", ephemeral: true });
    }

    case "setchannelcastigos": {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "❌ Solo administradores pueden usar este comando.", ephemeral: true });
      }
      const canal = interaction.options.getChannel("canal");
      config.channels[interaction.guild.id] ??= {};
      config.channels[interaction.guild.id].castigos = canal.id;
      saveConfig();
      return interaction.reply({ content: "✅ Canal de castigos configurado.", ephemeral: true });
    }

case "setchannelbienvenidas": {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: "❌ Solo administradores pueden usar este comando.", ephemeral: true });
  }
  const canal = interaction.options.getChannel("canal");
  const mensaje = interaction.options.getString("mensaje") ?? null;
  const bannerUrl = interaction.options.getString("banner_url") ?? null;
  const url = interaction.options.getString("url") ?? null;

  config.channels[interaction.guild.id] ??= {};
  config.channels[interaction.guild.id].bienvenidas = canal.id;
  if (mensaje !== null) config.channels[interaction.guild.id].bienvenidasMessage = mensaje;
  if (bannerUrl !== null && bannerUrl !== "") config.channels[interaction.guild.id].bienvenidasBanner = bannerUrl;
  if (url !== null && url !== "") config.channels[interaction.guild.id].bienvenidasUrl = url;
  saveConfig();

  return interaction.reply({ content: "✅ Canal, plantilla, banner y URL configurados.", ephemeral: true });
}
    case "setchanneldespedidas": {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "❌ Solo administradores pueden usar este comando.", ephemeral: true });
      }
      const canal = interaction.options.getChannel("canal");
      const mensaje = interaction.options.getString("mensaje") ?? null;
      const url = interaction.options.getString("url") ?? null;

      config.channels[interaction.guild.id] ??= {};
      config.channels[interaction.guild.id].despedidas = canal.id;
      if (mensaje !== null) config.channels[interaction.guild.id].despedidasMessage = mensaje;
      if (url !== null && url !== "") config.channels[interaction.guild.id].despedidasUrl = url;
      saveConfig();
      return interaction.reply({ content: "✅ Canal, plantilla y URL (si se proporcionó) configurados.", ephemeral: true });
    }

    case "setchannelboost": {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "❌ Solo administradores pueden usar este comando.", ephemeral: true });
      }
      const canal = interaction.options.getChannel("canal");
      const mensaje = interaction.options.getString("mensaje") ?? null;
      const url = interaction.options.getString("url") ?? null;

      config.channels[interaction.guild.id] ??= {};
      config.channels[interaction.guild.id].boost = canal.id;
      if (mensaje !== null) config.channels[interaction.guild.id].boostMessage = mensaje;
      if (url !== null && url !== "") config.channels[interaction.guild.id].boostUrl = url;
      saveConfig();
      return interaction.reply({ content: "✅ Canal, plantilla y URL (si se proporcionó) configurados.", ephemeral: true });
    }

    case "setchannelalianzas":
      config.channels[interaction.guild.id] ??= {};
      config.channels[interaction.guild.id].alianzas = interaction.options.getChannel("canal").id;
      saveConfig();
      return interaction.reply({ content: "✅ Canal de alianzas configurado.", ephemeral: true });

    // Comando temporal de prueba (opcional) - eliminar cuando ya no lo necesites
    case "testwelcome": {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "❌ Solo administradores.", ephemeral: true });
      }
      const user = interaction.options.getUser("user");
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ content: "No pude obtener el miembro.", ephemeral: true });
      await sendWelcome(member);
      return interaction.reply({ content: "✅ Enviado embed de prueba.", ephemeral: true });
    }

    default:
      return interaction.reply({ content: "❌ Comando desconocido.", ephemeral: true });
  }
}

/* ==========================
          EXPORTS
========================== */
export { config, saveConfig, ensureCounterChannel };
