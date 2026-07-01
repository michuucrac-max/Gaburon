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
// 📢 anuncio
// =====================
export async function anuncio(interaction) {
  return interaction.reply({ content: "Placeholder: anuncio", ephemeral: true });
}

// =====================
// 🔗 alianza
// =====================
export async function alianza(interaction) {
  return interaction.reply({ content: "Placeholder: alianza", ephemeral: true });
}

// =====================
// ⚠️ castigar
// =====================
export async function castigar(interaction) {
  return interaction.reply({ content: "Placeholder: castigar", ephemeral: true });
}

// =====================
// 👤 createhuman
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

// =====================
// 🤖 createbot
// =====================
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
// setchanneltikets
// =====================
export async function setchanneltikets(interaction) {
  try {
    // Guardar canal de tickets en config
    config.channels ??= {};
    config.channels[interaction.guild.id] ??= {};
    config.channels[interaction.guild.id].tickets = interaction.channel.id;
    saveConfig();

    // Banner con botón para crear ticket
    const embed = new EmbedBuilder()
      .setColor(0x6A4CFF)
      .setTitle("🎫 Sistema de Tickets • Made in Abyss")
      .setDescription(
        "Si tienes alguna **queja, duda o sugerencia**, puedes crear un ticket.\n\n" +
        "Un miembro de la **Administración** te atenderá lo antes posible."
      )
      .setImage("https://media1.tenor.com/m/yfxTAck9--UAAAAd/belaf-made-in-abyss.gif")
      .setFooter({ text: "Belaft • Sistema de Tickets" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_create")
        .setLabel("🎫 Crear Ticket")
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });

    return interaction.reply({
      content: `✅ Canal de tickets configurado: <#${interaction.channel.id}>`,
      ephemeral: true
    });
  } catch (err) {
    console.error("❌ Error configurando canal de tickets:", err);
    return interaction.reply({
      content: "❌ Hubo un error al configurar el canal de tickets.",
      ephemeral: true
    });
  }
}

// =====================
// ticket_create
// =====================
export async function handleTicketCreate(interaction) {
  const guild = interaction.guild;

  // Buscar o crear categoría Administración
  let category = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === "administracion"
  );
  if (!category) {
    category = await guild.channels.create({
      name: "Administracion",
      type: ChannelType.GuildCategory
    });
  }

  // Crear canal de ticket
  const ticketChannel = await guild.channels.create({
    name: `ticket-${interaction.user.username}`,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] }
    ]
  });

  // Notificar al usuario directamente en el canal del ticket
  await ticketChannel.send(`🎫 Hola ${interaction.user}, tu ticket ha sido creado. Un administrador te atenderá aquí.`);

  // Notificar a administradores
  const adminRole = guild.roles.cache.find(r => r.permissions.has("Administrator"));
  if (adminRole) {
    await ticketChannel.send(`📢 <@&${adminRole.id}> nuevo ticket creado por ${interaction.user}.`);
  }

  // Embed dentro del ticket con botones
  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("🎫 Ticket en revisión")
    .setDescription("Un administrador revisará tu caso.\n\nUsa los botones para gestionar el ticket.");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_accept")
      .setLabel("✅ Aceptar")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("ticket_reject")
      .setLabel("❌ Rechazar")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("ticket_close")
      .setLabel("🔒 Cerrar")
      .setStyle(ButtonStyle.Secondary)
  );

  await ticketChannel.send({ embeds: [embed], components: [row] });

  // Confirmación al usuario (ephemeral en el canal original)
  await interaction.reply({
    content: `✅ Ticket creado: <#${ticketChannel.id}>`,
    ephemeral: true
  });
}

// =====================
// ticket_buttons
// =====================
export async function handleTicketButtons(interaction) {
  const channel = interaction.channel;

  switch (interaction.customId) {
    case "ticket_accept":
      await interaction.reply({ content: "✅ Ticket aceptado.", ephemeral: false });
      break;

    case "ticket_reject":
    case "ticket_close":
      await interaction.reply({ content: "❌ Ticket cerrado.", ephemeral: false });
      await channel.delete().catch(() => {});
      break;
  }
}

// =====================
// 🏆 settoptop
// =====================
export async function settoptop(interaction) {
  return interaction.reply({ content: "Placeholder: settoptop", ephemeral: true });
}

// =====================
// ⚙️ setchannelanuncios
// =====================
export async function setchannelanuncios(interaction) {
  return interaction.reply({ content: "Placeholder: setchannelanuncios", ephemeral: true });
}

// =====================
// ⚙️ setchannelcastigos
// =====================
export async function setchannelcastigos(interaction) {
  return interaction.reply({ content: "Placeholder: setchannelcastigos", ephemeral: true });
}

// =====================
// ⚙️ setchannelbienvenidas
// =====================
export async function setchannelbienvenidas(interaction) {
  return interaction.reply({ content: "Placeholder: setchannelbienvenidas", ephemeral: true });
}

// =====================
// ⚙️ setchanneldespedidas
// =====================
export async function setchanneldespedidas(interaction) {
  return interaction.reply({ content: "Placeholder: setchanneldespedidas", ephemeral: true });
}

// =====================
// ⚙️ setchannelalianzas
// =====================
export async function setchannelalianzas(interaction) {
  return interaction.reply({ content: "Placeholder: setchannelalianzas", ephemeral: true });
}

// =====================
// ⚙️ setchannelboost
// =====================
export async function setchannelboost(interaction) {
  return interaction.reply({ content: "Placeholder: setchannelboost", ephemeral: true });
}
