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
       FUNCIONES
========================== */
function placeholder(interaction, text) {
  return interaction.reply({ content: text, ephemeral: true });
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
export async function ensureCounterChannel(guild, key, label, count) {
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

    case "setchannelanuncios":
      config.channels[interaction.guild.id] ??= {};
      config.channels[interaction.guild.id].anuncios = interaction.options.getChannel("canal").id;
      saveConfig();
      return interaction.reply({ content: "✅ Canal de anuncios configurado.", ephemeral: true });

    case "setchannelcastigos":
      config.channels[interaction.guild.id] ??= {};
      config.channels[interaction.guild.id].castigos = interaction.options.getChannel("canal").id;
      saveConfig();
      return interaction.reply({ content: "✅ Canal de castigos configurado.", ephemeral: true });

    case "setchannelbienvenidas":
      config.channels[interaction.guild.id] ??= {};
      config.channels[interaction.guild.id].bienvenidas = interaction.options.getChannel("canal").id;
      saveConfig();
      return interaction.reply({ content: "✅ Canal de bienvenidas configurado.", ephemeral: true });

    case "setchanneldespedidas":
      config.channels[interaction.guild.id] ??= {};
      config.channels[interaction.guild.id].despedidas = interaction.options.getChannel("canal").id;
      saveConfig();
      return interaction.reply({ content: "✅ Canal de despedidas configurado.", ephemeral: true });

    case "setchannelalianzas":
      config.channels[interaction.guild.id] ??= {};
      config.channels[interaction.guild.id].alianzas = interaction.options.getChannel("canal").id;
      saveConfig();
      return interaction.reply({ content: "✅ Canal de alianzas configurado.", ephemeral: true });

    case "setchannelboost":
      config.channels[interaction.guild.id] ??= {};
      config.channels[interaction.guild.id].boost = interaction.options.getChannel("canal").id;
      saveConfig();
      return interaction.reply({ content: "✅ Canal de boost configurado.", ephemeral: true });

    default:
      return interaction.reply({ content: "❌ Comando desconocido.", ephemeral: true });
  }
}

/* ==========================
          EXPORTS
========================== */
export { config, saveConfig, ensureCounterChannel };
