// logic.js
import { EmbedBuilder } from "discord.js";
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
// PLACEHOLDERS DE COMANDOS
// =====================

// 📢 ANUNCIO
export async function anuncio(interaction) {
  // TODO: implementar lógica de anuncio
  return interaction.reply({ content: "Placeholder: anuncio", ephemeral: true });
}

// 🔗 ALIANZA
export async function alianza(interaction) {
  // TODO: implementar lógica de alianza
  return interaction.reply({ content: "Placeholder: alianza", ephemeral: true });
}

// ⚠️ CASTIGAR
export async function castigar(interaction) {
  // TODO: implementar lógica de castigar
  return interaction.reply({ content: "Placeholder: castigar", ephemeral: true });
}

// 👤 CREATE HUMAN COUNTER
export async function createhuman(interaction) {
  try {
    const guild = interaction.guild;

    // Buscar o crear categoría "Status"
    let category = guild.channels.cache.find(
      c => c.type === 4 && c.name.toLowerCase() === "status"
    );
    if (!category) {
      category = await guild.channels.create({
        name: "Status",
        type: 4 // GuildCategory
      });
    }

    // Contar humanos
    const members = await guild.members.fetch();
    const humans = members.filter(m => !m.user.bot).size;

    // Crear canal de voz contador
    const ch = await guild.channels.create({
      name: `👤 Exploradores: ${humans}`,
      type: 2, // GuildVoice
      parent: category.id,
      permissionOverwrites: [
        { id: guild.id, deny: ["Connect"] }
      ]
    });

    // Guardar en config
    config.counters.users = ch.id;
    saveConfig();

    return interaction.reply({ content: "Contador humano creado en categoría Status.", ephemeral: true });
  } catch (err) {
    console.error("Error creando contador humanos:", err);
    return interaction.reply({ content: "Error creando contador humanos.", ephemeral: true });
  }
}

// 🤖 CREATE BOT COUNTER
export async function createbot(interaction) {
  try {
    const guild = interaction.guild;

    // Buscar o crear categoría "Status"
    let category = guild.channels.cache.find(
      c => c.type === 4 && c.name.toLowerCase() === "status"
    );
    if (!category) {
      category = await guild.channels.create({
        name: "Status",
        type: 4 // GuildCategory
      });
    }

    // Contar bots
    const members = await guild.members.fetch();
    const bots = members.filter(m => m.user.bot).size;

    // Crear canal de voz contador
    const ch = await guild.channels.create({
      name: `🤖 Unidades: ${bots}`,
      type: 2, // GuildVoice
      parent: category.id,
      permissionOverwrites: [
        { id: guild.id, deny: ["Connect"] }
      ]
    });

    // Guardar en config
    config.counters.bots = ch.id;
    saveConfig();

    return interaction.reply({ content: "Contador bot creado en categoría Status.", ephemeral: true });
  } catch (err) {
    console.error("Error creando contador bots:", err);
    return interaction.reply({ content: "Error creando contador bots.", ephemeral: true });
  }
}


// 🎫 SET CHANNEL TICKETS
export async function setchanneltikets(interaction) {
  // TODO: implementar lógica de canal tickets
  return interaction.reply({ content: "Placeholder: setchanneltikets", ephemeral: true });
}

// 🏆 SET TOP CHANNEL
export async function settoptop(interaction) {
  // TODO: implementar lógica de canal tops
  return interaction.reply({ content: "Placeholder: settoptop", ephemeral: true });
}

// 📢 SET CHANNEL ANUNCIOS
export async function setchannelanuncios(interaction) {
  // TODO: implementar lógica de canal anuncios
  return interaction.reply({ content: "Placeholder: setchannelanuncios", ephemeral: true });
}

// ⚠️ SET CHANNEL CASTIGOS
export async function setchannelcastigos(interaction) {
  // TODO: implementar lógica de canal castigos
  return interaction.reply({ content: "Placeholder: setchannelcastigos", ephemeral: true });
}

// 👋 SET CHANNEL BIENVENIDAS
export async function setchannelbienvenidas(interaction) {
  // TODO: implementar lógica de canal bienvenidas
  return interaction.reply({ content: "Placeholder: setchannelbienvenidas", ephemeral: true });
}

// 👋 SET CHANNEL DESPEDIDAS
export async function setchanneldespedidas(interaction) {
  // TODO: implementar lógica de canal despedidas
  return interaction.reply({ content: "Placeholder: setchanneldespedidas", ephemeral: true });
}

// 🤝 SET CHANNEL ALIANZAS
export async function setchannelalianzas(interaction) {
  // TODO: implementar lógica de canal alianzas
  return interaction.reply({ content: "Placeholder: setchannelalianzas", ephemeral: true });
}

// 🚀 SET CHANNEL BOOST
export async function setchannelboost(interaction) {
  // TODO: implementar lógica de canal boost
  return interaction.reply({ content: "Placeholder: setchannelboost", ephemeral: true });
}
