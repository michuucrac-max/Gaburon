const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");

const config = require("./config.json");
const punishments = require("./punishments.json");

/* ================= CLIENTE ================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

/* ================= READY ================= */
client.once(Events.ClientReady, () => {
  console.log(`🛡️ Gaburon activo como ${client.user.tag}`);
});

/* ================= INTERACTIONS ================= */
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  /* =================================================
     SET CHANNEL ANUNCIOS
     ================================================= */
  if (interaction.commandName === "setchannelanuncios") {
    const canal = interaction.options.getChannel("canal");

    if (canal.type !== ChannelType.GuildText) {
      return interaction.reply({ content: "Canal inválido.", ephemeral: true });
    }

    config.channels.anuncios = canal.id;
    fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));

    return interaction.reply({
      content: `Canal de anuncios establecido: ${canal}`,
      ephemeral: true
    });
  }

  /* =================================================
     SET CHANNEL ALIANZAS
     ================================================= */
  if (interaction.commandName === "setchannelalianzas") {
    const canal = interaction.options.getChannel("canal");

    if (canal.type !== ChannelType.GuildText) {
      return interaction.reply({ content: "Canal inválido.", ephemeral: true });
    }

    config.channels.alianzas = canal.id;
    fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));

    return interaction.reply({
      content: `Canal de alianzas establecido: ${canal}`,
      ephemeral: true
    });
  }

  /* =================================================
     ANUNCIO
     ================================================= */
  if (interaction.commandName === "anuncio") {
    const mensaje = interaction.options.getString("mensaje");

    const canal = interaction.guild.channels.cache.get(
      config.channels.anuncios
    );

    if (!canal) {
      return interaction.reply({
        content: "Canal de anuncios no configurado.",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("📢 COMUNICADO DEL SISTEMA")
      .setDescription(mensaje)
      .setFooter({ text: "Emitido por GABURON" })
      .setColor(0x4b4b4b);

    await canal.send({ embeds: [embed] });

    return interaction.reply({
      content: "Anuncio transmitido.",
      ephemeral: true
    });
  }

  /* =================================================
     ALIANZA + PING AUTOMÁTICO
     ================================================= */
  if (interaction.commandName === "alianza") {
    const servidor = interaction.options.getString("servidor");
    const descripcion = interaction.options.getString("descripcion");

    const canal = interaction.guild.channels.cache.get(
      config.channels.alianzas
    );

    if (!canal) {
      return interaction.reply({
        content: "Canal de alianzas no configurado.",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("🔗 NUEVA ALIANZA REGISTRADA")
      .addFields(
        { name: "Servidor", value: servidor },
        { name: "Descripción", value: descripcion }
      )
      .setFooter({ text: "Protocolo gestionado por GABURON" })
      .setColor(0x3a3a3a);

    await canal.send({
      content: "@everyone",
      embeds: [embed]
    });

    return interaction.reply({
      content: "Alianza registrada y anunciada.",
      ephemeral: true
    });
  }

  /* =================================================
     CASTIGAR (DESDE JSON)
     ================================================= */
  if (interaction.commandName === "castigar") {
    await interaction.deferReply({ ephemeral: true });

    const user = interaction.options.getUser("usuario");
    const castigoId = interaction.options.getString("castigo");

    const data = punishments.find(p => p.id === castigoId);
    if (!data) {
      return interaction.editReply("Castigo inexistente.");
    }

    const member = await interaction.guild.members
      .fetch(user.id)
      .catch(() => null);

    if (!member) {
      return interaction.editReply("Entidad no localizada.");
    }

    try {
      if (data.action === "timeout") {
        await member.timeout(
          data.duration,
          `Sentencia ejecutada por GABURON`
        );
      }

      if (data.action === "ban") {
        await member.ban({
          reason: "Sentencia absoluta ejecutada por GABURON"
        });
      }
    } catch {
      return interaction.editReply("Permisos insuficientes.");
    }

    const canalCastigos = interaction.guild.channels.cache.get(
      config.channels.castigos
    );

    if (canalCastigos) {
      await canalCastigos.send(
        `⚠ **SENTENCIA DEL ABISMO**\n` +
        `Entidad: ${user}\n` +
        `Castigo: **${data.nombre}**\n` +
        `Descripción: ${data.descripcion}\n` +
        `Autor: **GABURON**`
      );
    }

    return interaction.editReply(
      `Sentencia ejecutada: ${data.nombre}`
    );
  }
});

/* ================= WELCOME ================= */
client.on(Events.GuildMemberAdd, member => {
  const canal = member.guild.channels.cache.get(config.channels.welcome);
  if (!canal) return;

  canal.send(
    `🛡️ **ENTRADA REGISTRADA**\nEntidad: ${member}\nSistema: GABURON`
  );
});

/* ================= LEAVE ================= */
client.on(Events.GuildMemberRemove, member => {
  const canal = member.guild.channels.cache.get(config.channels.leave);
  if (!canal) return;

  canal.send(
    `📜 **SALIDA REGISTRADA**\nEntidad: ${member.user.tag}\nSistema: GABURON`
  );
});

/* ================= LOGIN ================= */
client.login(config.token);
