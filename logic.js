// logic.js
import {
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";
import fs from "fs";

// =====================
// CONFIG
// =====================
const CONFIG_PATH = "./config.json";
let config = fs.existsSync(CONFIG_PATH)
  ? JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"))
  : {};
const saveConfig = () =>
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

// =====================
// 📢 ANUNCIOS / 🔗 ALIANZAS / ⚠️ CASTIGOS
// =====================
export async function anuncio(interaction) {
  return interaction.reply({ content: "Placeholder: anuncio", ephemeral: true });
}

export async function alianza(interaction) {
  return interaction.reply({ content: "Placeholder: alianza", ephemeral: true });
}

export async function castigar(interaction) {
  return interaction.reply({ content: "Placeholder: castigar", ephemeral: true });
}

// =====================
// 👤🤖 CONTADORES
// =====================
export async function createhuman(interaction) {
  try {
    const guild = interaction.guild;
    let category = guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === "status"
    );
    if (!category) {
      category = await guild.channels.create({
        name: "Status",
        type: ChannelType.GuildCategory
      });
    }
    const members = await guild.members.fetch();
    const humans = members.filter(m => !m.user.bot).size;
    const ch = await guild.channels.create({
      name: `👤 Exploradores: ${humans}`,
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.Connect] }]
    });
    config.counters.users = ch.id;
    saveConfig();
    return interaction.reply({ content: "Contador humano creado en categoría Status.", ephemeral: true });
  } catch (err) {
    console.error("Error creando contador humanos:", err);
    return interaction.reply({ content: "Error creando contador humanos.", ephemeral: true });
  }
}

export async function createbot(interaction) {
  try {
    const guild = interaction.guild;
    let category = guild.channels.cache.find(
      c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === "status"
    );
    if (!category) {
      category = await guild.channels.create({
        name: "Status",
        type: ChannelType.GuildCategory
      });
    }
    const members = await guild.members.fetch();
    const bots = members.filter(m => m.user.bot).size;
    const ch = await guild.channels.create({
      name: `🤖 Unidades: ${bots}`,
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.Connect] }]
    });
    config.counters.bots = ch.id;
    saveConfig();
    return interaction.reply({ content: "Contador bot creado en categoría Status.", ephemeral: true });
  } catch (err) {
    console.error("Error creando contador bots:", err);
    return interaction.reply({ content: "Error creando contador bots.", ephemeral: true });
  }
}

// =====================
// 🎫 TICKETS
// =====================
export async function setchanneltikets(interaction) {
  return interaction.reply({ content: "Placeholder: setchanneltikets", ephemeral: true });
}

// (Aquí luego añadiremos la lógica de creación de tickets con categoría Administración)

// =====================
// 🏆 TOPS
// =====================
export async function settoptop(interaction) {
  return interaction.reply({ content: "Placeholder: settoptop", ephemeral: true });
}

// =====================
// ⚙️ CONFIGURACIÓN DE CANALES
// =====================
export async function setchannelanuncios(interaction) {
  return interaction.reply({ content: "Placeholder: setchannelanuncios", ephemeral: true });
}

export async function setchannelcastigos(interaction) {
  return interaction.reply({ content: "Placeholder: setchannelcastigos", ephemeral: true });
}

export async function setchannelbienvenidas(interaction) {
  return interaction.reply({ content: "Placeholder: setchannelbienvenidas", ephemeral: true });
}

export async function setchanneldespedidas(interaction) {
  return interaction.reply({ content: "Placeholder: setchanneldespedidas", ephemeral: true });
}

export async function setchannelalianzas(interaction) {
  return interaction.reply({ content: "Placeholder: setchannelalianzas", ephemeral: true });
}

export async function setchannelboost(interaction) {
  return interaction.reply({ content: "Placeholder: setchannelboost", ephemeral: true });
}
