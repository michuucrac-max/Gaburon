/* ==========================
          IMPORTS
========================== */

import fs from "fs";

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    EmbedBuilder,
    PermissionsBitField
} from "discord.js";

/* ==========================
           RUTAS
========================== */

const CONFIG_PATH = "./config.json";

/* ==========================
           CONFIG
========================== */

let config = {
    channels: {},
    counters: {}
};

// Cargar la configuración al iniciar el archivo
loadConfig();

/* ==========================
        CONFIG.JSON
========================== */

/**
 * Carga la configuración desde config.json.
 */
function loadConfig() {

    if (!fs.existsSync(CONFIG_PATH)) {

        saveConfig();
        return;

    }

    try {

        const data = fs.readFileSync(CONFIG_PATH, "utf8");

        config = JSON.parse(data);

    } catch (err) {

        console.error("⚠️ config.json corrupto. Restaurando configuración...");

        config = {
            channels: {},
            counters: {}
        };

        saveConfig();

    }

    // Asegurar que existan las propiedades necesarias
    config.channels ??= {};
    config.counters ??= {};

}

/**
 * Guarda la configuración en config.json.
 */
function saveConfig() {

    try {

        fs.writeFileSync(
            CONFIG_PATH,
            JSON.stringify(config, null, 4),
            "utf8"
        );

    } catch (err) {

        console.error("❌ Error al guardar config.json:");
        console.error(err);

    }

}

/* ==========================
       FUNCIONES AUXILIARES
========================== */

/* ==========================
      Placeholder
========================== */

/**
 * Envía una respuesta efímera.
 */
function placeholder(interaction, text) {

    return interaction.reply({
        content: text,
        ephemeral: true
    });

}

/* ==========================
    Formatear Plantillas
========================== */

/**
 * Reemplaza los placeholders de un mensaje.
 *
 * Placeholders disponibles:
 * {user}
 * {username}
 * {server}
 * {avatar}
 * {banner}
 */
function formatTemplate(template, member) {

    if (!template)
        return "";

    return template
        .replaceAll("{user}", `<@${member.id}>`)
        .replaceAll("{username}", member.user.username)
        .replaceAll("{server}", member.guild.name)
        .replaceAll(
            "{avatar}",
            member.user.displayAvatarURL({
                extension: "png",
                size: 1024
            })
        )
        .replaceAll("{banner}", "");

}

/* ==========================
      Validar URL
========================== */

/**
 * Comprueba si una URL es válida.
 */
function isValidUrl(url) {

    if (!url)
        return false;

    try {

        const parsed = new URL(url);

        return (
            parsed.protocol === "http:" ||
            parsed.protocol === "https:"
        );

    } catch {

        return false;

    }

}

/* ==========================
      Crear Botón URL
========================== */

/**
 * Crea un botón de tipo Link.
 */
function createUrlButton(url, label = "Abrir enlace") {

    if (!isValidUrl(url))
        return [];

    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel(label)
                .setURL(url)
        )
    ];

}

/* ==========================
     Configuración Guild
========================== */

/**
 * Obtiene la configuración de un servidor.
 */
function getGuildConfig(guildId) {

    config.channels[guildId] ??= {};

    return config.channels[guildId];

}

/* ==========================
            Logs
========================== */

/**
 * Log simple para depuración.
 */
function log(...args) {

    console.log("[Logic]", ...args);

}

/* ==========================
      Función: sendWelcome
========================== */

/**
 * Envía el mensaje de bienvenida.
 */
export async function sendWelcome(member) {

    try {

        const guildConfig = getGuildConfig(member.guild.id);

        if (!guildConfig.bienvenidas)
            return;

        const channel = await member.guild.channels
            .fetch(guildConfig.bienvenidas)
            .catch(() => null);

        if (!channel)
            return log("Canal de bienvenida no encontrado.");

        if (!channel.isTextBased())
            return log("El canal de bienvenida no admite mensajes.");

        const permissions = channel.permissionsFor(member.guild.members.me);

        if (
            !permissions?.has(PermissionsBitField.Flags.ViewChannel) ||
            !permissions?.has(PermissionsBitField.Flags.SendMessages) ||
            !permissions?.has(PermissionsBitField.Flags.EmbedLinks)
        ) {

            return log("Faltan permisos para enviar la bienvenida.");

        }

        const embed = new EmbedBuilder()

            .setColor(0x57F287)

            .setTitle("👋 ¡Nuevo miembro!")

            .setDescription(
                formatTemplate(
                    guildConfig.bienvenidasMessage ??
                    "¡Bienvenido {user} a **{server}**!",
                    member
                )
            )

            .setThumbnail(
                member.user.displayAvatarURL({
                    extension: "png",
                    size: 1024
                })
            )

            .setFooter({
                text: member.guild.name
            })

            .setTimestamp();

        await channel.send({

            embeds: [embed],

            components: createUrlButton(
                guildConfig.bienvenidasUrl,
                "🌐 Abrir enlace"
            )

        });

        log(`Bienvenida enviada a ${member.user.tag}.`);

    } catch (err) {

        console.error("Error en sendWelcome:");
        console.error(err);

    }

}

/* ==========================
     Función: sendFarewell
========================== */

/**
 * Envía el mensaje de despedida.
 */
export async function sendFarewell(member) {

    try {

        const guildConfig = getGuildConfig(member.guild.id);

        if (!guildConfig.despedidas)
            return;

        const channel = await member.guild.channels
            .fetch(guildConfig.despedidas)
            .catch(() => null);

        if (!channel)
            return log("Canal de despedidas no encontrado.");

        if (!channel.isTextBased())
            return log("El canal de despedidas no admite mensajes.");

        const permissions = channel.permissionsFor(member.guild.members.me);

        if (
            !permissions?.has(PermissionsBitField.Flags.ViewChannel) ||
            !permissions?.has(PermissionsBitField.Flags.SendMessages) ||
            !permissions?.has(PermissionsBitField.Flags.EmbedLinks)
        ) {

            return log("Faltan permisos para enviar la despedida.");

        }

        const embed = new EmbedBuilder()

            .setColor(0xED4245)

            .setTitle("👋 ¡Hasta pronto!")

            .setDescription(
                formatTemplate(
                    guildConfig.despedidasMessage ??
                    "👋 {user} ha salido de **{server}**.",
                    member
                )
            )

            .setThumbnail(
                member.user.displayAvatarURL({
                    extension: "png",
                    size: 1024
                })
            )

            .setFooter({
                text: member.guild.name
            })

            .setTimestamp();

        await channel.send({

            embeds: [embed],

            components: createUrlButton(
                guildConfig.despedidasUrl,
                "🌐 Abrir enlace"
            )

        });

        log(`Despedida enviada de ${member.user.tag}.`);

    } catch (err) {

        console.error("Error en sendFarewell:");
        console.error(err);

    }

}

/* ==========================
      Función: handleBoost
========================== */

/**
 * Envía el mensaje cuando un usuario impulsa el servidor.
 */
export async function handleBoost(oldMember, newMember) {

    try {

        // Solo continuar cuando el usuario acaba de dar boost
        if (oldMember.premiumSince || !newMember.premiumSince)
            return;

        const guildConfig = getGuildConfig(newMember.guild.id);

        if (!guildConfig.boost)
            return;

        const channel = await newMember.guild.channels
            .fetch(guildConfig.boost)
            .catch(() => null);

        if (!channel)
            return log("Canal de boosts no encontrado.");

        if (!channel.isTextBased())
            return log("El canal de boosts no admite mensajes.");

        const permissions = channel.permissionsFor(newMember.guild.members.me);

        if (
            !permissions?.has(PermissionsBitField.Flags.ViewChannel) ||
            !permissions?.has(PermissionsBitField.Flags.SendMessages) ||
            !permissions?.has(PermissionsBitField.Flags.EmbedLinks)
        ) {

            return log("Faltan permisos para enviar el mensaje de boost.");

        }

        const embed = new EmbedBuilder()

            .setColor(0xFF73FA)

            .setTitle("💎 ¡Nuevo Boost!")

            .setDescription(
                formatTemplate(
                    guildConfig.boostMessage ??
                    "💎 ¡{user} ha impulsado **{server}**!\n\n¡Muchas gracias por el apoyo!",
                    newMember
                )
            )

            .setThumbnail(
                newMember.user.displayAvatarURL({
                    extension: "png",
                    size: 1024
                })
            )

            .setFooter({
                text: newMember.guild.name
            })

            .setTimestamp();

        await channel.send({

            embeds: [embed],

            components: createUrlButton(
                guildConfig.boostUrl,
                "🌐 Abrir enlace"
            )

        });

        log(`${newMember.user.tag} impulsó el servidor.`);

    } catch (err) {

        console.error("Error en handleBoost:");
        console.error(err);

    }

}

/* ==========================
    FUNCIONES DE CONTADORES
========================== */

/* ==========================
      Actualizar Contador
========================== */

/**
 * Crea o actualiza un contador.
 */
async function ensureCounterChannel(guild, key, label, count) {

    try {

        config.counters[guild.id] ??= {};

        let channel = null;

        const savedId = config.counters[guild.id][key];

        // Buscar por ID guardado
        if (savedId) {

            channel = await guild.channels.fetch(savedId).catch(() => null);

        }

        // Buscar la categoría Status
        let category = guild.channels.cache.find(channel =>
            channel.type === ChannelType.GuildCategory &&
            channel.name === "Status"
        );

        // Crear categoría si no existe
        if (!category) {

            category = await guild.channels.create({

                name: "Status",

                type: ChannelType.GuildCategory

            });

            log("Categoría 'Status' creada.");

        }

        // Buscar el contador si no se encontró por ID
        if (!channel) {

            channel = guild.channels.cache.find(c =>
                c.parentId === category.id &&
                c.type === ChannelType.GuildVoice &&
                c.name.startsWith(label)
            );

        }

        // Crear contador
        if (!channel) {

            channel = await guild.channels.create({

                name: `${label}: ${count}`,

                type: ChannelType.GuildVoice,

                parent: category.id,

                permissionOverwrites: [

                    {
                        id: guild.roles.everyone.id,

                        deny: [
                            PermissionsBitField.Flags.Connect
                        ]
                    }

                ]

            });

            log(`Contador "${label}" creado.`);

        }

        // Guardar ID
        config.counters[guild.id][key] = channel.id;

        saveConfig();

        const newName = `${label}: ${count}`;

        if (channel.name !== newName) {

            await channel.setName(newName);

        }

    } catch (err) {

        console.error(`Error actualizando contador "${key}":`);
        console.error(err);

    }

}

/* ==========================
    Actualizar Contadores
========================== */

/**
 * Actualiza todos los contadores del servidor.
 */
export async function updateCounters(guild) {

    await ensureCounterChannel(
        guild,
        "members",
        "👥 Miembros",
        guild.memberCount
    );

    await ensureCounterChannel(
        guild,
        "bots",
        "🤖 Bots",
        guild.members.cache.filter(member => member.user.bot).size
    );

    await ensureCounterChannel(
        guild,
        "humans",
        "🧑 Humanos",
        guild.members.cache.filter(member => !member.user.bot).size
    );

}

/* ==========================
          BOTONES
========================== */

/* ==========================
      Crear Ticket
========================== */

/**
 * Crea un ticket para un usuario.
 */
async function createTicket(interaction) {

    try {

        // Buscar o crear la categoría
        let category = interaction.guild.channels.cache.find(channel =>
            channel.type === ChannelType.GuildCategory &&
            channel.name.toLowerCase() === "administración"
        );

        if (!category) {

            category = await interaction.guild.channels.create({

                name: "Administración",

                type: ChannelType.GuildCategory

            });

            log("Categoría 'Administración' creada.");

        }

        // Verificar si el usuario ya tiene un ticket abierto
        const existingTicket = interaction.guild.channels.cache.find(channel =>
            channel.parentId === category.id &&
            channel.topic === interaction.user.id
        );

        if (existingTicket) {

            return interaction.reply({

                content: `❌ Ya tienes un ticket abierto: ${existingTicket}`,

                ephemeral: true

            });

        }

        // Nombre limpio para el canal
        const username = interaction.user.username
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 80);

        // Crear canal
        const ticket = await interaction.guild.channels.create({

            name: `ticket-${username}`,

            type: ChannelType.GuildText,

            parent: category.id,

            topic: interaction.user.id,

            permissionOverwrites: [

                {
                    id: interaction.guild.roles.everyone.id,

                    deny: [
                        PermissionsBitField.Flags.ViewChannel
                    ]

                },

                {
                    id: interaction.user.id,

                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]

                }

            ]

        });

        // Embed inicial
        const embed = new EmbedBuilder()

            .setColor(0x5865F2)

            .setTitle("🎫 Ticket creado")

            .setDescription(
                [
                    `Bienvenido ${interaction.user}.`,
                    "",
                    "Explica tu problema con el mayor detalle posible.",
                    "Un miembro del equipo te responderá lo antes posible."
                ].join("\n")
            )

            .setTimestamp();

        // Botones
        const row = new ActionRowBuilder()

            .addComponents(

                new ButtonBuilder()
                    .setCustomId("ticket_accept")
                    .setLabel("Aceptar")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("ticket_reject")
                    .setLabel("Rechazar")
                    .setStyle(ButtonStyle.Danger),

                new ButtonBuilder()
                    .setCustomId("ticket_close")
                    .setLabel("Cerrar")
                    .setStyle(ButtonStyle.Secondary)

            );

        await ticket.send({

            content: `${interaction.user}`,

            embeds: [embed],

            components: [row]

        });

        await interaction.reply({

            content: `✅ Tu ticket ha sido creado correctamente: ${ticket}`,

            ephemeral: true

        });

        log(`${interaction.user.tag} creó un ticket.`);

    } catch (err) {

        console.error("Error en createTicket:");
        console.error(err);

        if (!interaction.replied && !interaction.deferred) {

            await interaction.reply({

                content: "❌ Ocurrió un error al crear el ticket.",

                ephemeral: true

            });

        }

    }

}

/* ==========================
      Aceptar Ticket
========================== */

/**
 * Marca un ticket como atendido.
 */
async function acceptTicket(interaction) {

    try {

        if (!interaction.channel.name.startsWith("ticket-")) {

            return interaction.reply({

                content: "❌ Este botón solo puede usarse dentro de un ticket.",

                ephemeral: true

            });

        }

        if (interaction.channel.name.endsWith("-atendido")) {

            return interaction.reply({

                content: "⚠️ Este ticket ya fue aceptado.",

                ephemeral: true

            });

        }

        await interaction.channel.setName(
            `${interaction.channel.name}-atendido`
        );

        const embed = new EmbedBuilder()

            .setColor(0x57F287)

            .setTitle("✅ Ticket aceptado")

            .setDescription(
                `${interaction.user} se hará cargo de este ticket.`
            )

            .setTimestamp();

        await interaction.reply({

            embeds: [embed]

        });

        log(`${interaction.user.tag} aceptó un ticket.`);

    } catch (err) {

        console.error("Error en acceptTicket:");
        console.error(err);

    }

}

/* ==========================
      Rechazar Ticket
========================== */

/**
 * Rechaza un ticket.
 */
async function rejectTicket(interaction) {

    try {

        if (!interaction.channel.name.startsWith("ticket-")) {

            return interaction.reply({

                content: "❌ Este botón solo puede usarse dentro de un ticket.",

                ephemeral: true

            });

        }

        const embed = new EmbedBuilder()

            .setColor(0xED4245)

            .setTitle("❌ Ticket rechazado")

            .setDescription(
                `${interaction.user} ha rechazado este ticket.\n\nSi crees que se trata de un error, contacta con un administrador.`
            )

            .setTimestamp();

        await interaction.reply({

            embeds: [embed]

        });

        log(`${interaction.user.tag} rechazó un ticket.`);

    } catch (err) {

        console.error("Error en rejectTicket:");
        console.error(err);

    }

}

/* ==========================
      Cerrar Ticket
========================== */

/**
 * Solicita confirmar el cierre del ticket.
 */
async function closeTicket(interaction) {

    try {

        if (!interaction.channel.name.startsWith("ticket-")) {

            return interaction.reply({

                content: "❌ Este botón solo puede usarse dentro de un ticket.",

                ephemeral: true

            });

        }

        const row = new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId("ticket_close_confirm")
                .setLabel("✅ Confirmar")
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId("ticket_close_cancel")
                .setLabel("❌ Cancelar")
                .setStyle(ButtonStyle.Secondary)

        );

        const embed = new EmbedBuilder()

            .setColor(0xFEE75C)

            .setTitle("⚠️ Confirmar cierre")

            .setDescription(
                "¿Estás seguro de que deseas cerrar este ticket?\n\nEsta acción eliminará el canal."
            );

        await interaction.reply({

            embeds: [embed],

            components: [row],

            ephemeral: true

        });

    } catch (err) {

        console.error("Error en closeTicket:");
        console.error(err);

    }

}

/* ==========================
    Confirmar Cierre
========================== */

/**
 * Elimina el ticket.
 */
async function confirmCloseTicket(interaction) {

    try {

        await interaction.update({

            content: "✅ Ticket cerrado. Eliminando canal en **5 segundos...**",

            embeds: [],

            components: []

        });

        await interaction.channel.send({

            embeds: [

                new EmbedBuilder()

                    .setColor(0xED4245)

                    .setTitle("🔒 Ticket cerrado")

                    .setDescription(
                        `Este ticket fue cerrado por ${interaction.user}.`
                    )

                    .setTimestamp()

            ]

        });

        setTimeout(async () => {

            try {

                await interaction.channel.delete(
                    `Ticket cerrado por ${interaction.user.tag}`
                );

            } catch (err) {

                console.error(err);

            }

        }, 5000);

    } catch (err) {

        console.error("Error en confirmCloseTicket:");
        console.error(err);

    }

}

/* ==========================
     Cancelar Cierre
========================== */

/**
 * Cancela el cierre del ticket.
 */
async function cancelCloseTicket(interaction) {

    await interaction.update({

        content: "✅ Cierre cancelado.",

        embeds: [],

        components: []

    });

}

/* ==========================
      Función Principal
========================== */

/**
 * Maneja todos los botones del bot.
 */
async function handleButtons(interaction) {

    try {

        switch (interaction.customId) {

            case "ticket_create":
                return await createTicket(interaction);

            case "ticket_accept":
                return await acceptTicket(interaction);

            case "ticket_reject":
                return await rejectTicket(interaction);

            case "ticket_close":
                return await closeTicket(interaction);

            case "ticket_close_confirm":
                return await confirmCloseTicket(interaction);

            case "ticket_close_cancel":
                return await cancelCloseTicket(interaction);

            default:
                return;

        }

    } catch (err) {

        console.error("Error en handleButtons:");
        console.error(err);

        if (
            interaction.isRepliable() &&
            !interaction.replied &&
            !interaction.deferred
        ) {

            await interaction.reply({

                content: "❌ Ocurrió un error al procesar este botón.",

                ephemeral: true

            });

        }

    }

}

/* ==========================
      SLASH COMMANDS
========================== */

/* ==========================
            Ping
========================== */

/**
 * Comando /ping
 */
async function cmdPing(interaction) {

    try {

        const sent = await interaction.reply({

            content: "🏓 Calculando latencia...",

            fetchReply: true

        });

        const latency = sent.createdTimestamp - interaction.createdTimestamp;

        await interaction.editReply({

            content:
                `🏓 **Pong!**\n\n` +
                `📡 Latencia: **${latency} ms**\n` +
                `🤖 API: **${Math.round(interaction.client.ws.ping)} ms**`

        });

    } catch (err) {

        console.error("Error en cmdPing:");
        console.error(err);

        if (!interaction.replied && !interaction.deferred) {

            await interaction.reply({

                content: "❌ Ocurrió un error al ejecutar este comando.",

                ephemeral: true

            });

        }

    }

}

/* ==========================
            Help
========================== */

/**
 * Comando /help
 */
async function cmdHelp(interaction) {

    try {

        const embed = new EmbedBuilder()

            .setColor(0x5865F2)

            .setTitle("📖 Centro de ayuda")

            .setDescription(
                [
                    "¡Hola! Estos son los comandos disponibles de **Gaburon**.",
                    "",
                    "> Los comandos de configuración del servidor no se muestran aquí."
                ].join("\n")
            )

            .setImage("AQUÍ_VA_LA_URL_DEL_BANNER")

            .addFields(

                {
                    name: "🏓 /ping",
                    value: "Muestra la latencia del bot y la API.",
                    inline: false
                },

                {
                    name: "📖 /help",
                    value: "Muestra este menú de ayuda.",
                    inline: false
                },

                {
                    name: "🎫 /ticket",
                    value: "Envía el panel para crear tickets.",
                    inline: false
                }

            )

            .setFooter({
                text: "Gaburon"
            })

            .setTimestamp();

        await interaction.reply({

            embeds: [embed],

            ephemeral: true

        });

    } catch (err) {

        console.error("Error en cmdHelp:");
        console.error(err);

        if (!interaction.replied && !interaction.deferred) {

            await interaction.reply({

                content: "❌ Ocurrió un error al ejecutar este comando.",

                ephemeral: true

            });

        }

    }

}

/* ==========================
        SetChannel
========================== */

/* ==========================
   SetChannelBienvenidas
========================== */

/**
 * Comando /setchannelbienvenidas
 */
async function cmdSetChannelBienvenidas(interaction) {

    try {

        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {

            return placeholder(
                interaction,
                "❌ Necesitas el permiso **Administrador** para usar este comando."
            );

        }

        const channel = interaction.options.getChannel("canal");

        if (!channel) {

            return placeholder(
                interaction,
                "❌ Debes seleccionar un canal."
            );

        }

        if (!channel.isTextBased()) {

            return placeholder(
                interaction,
                "❌ El canal debe permitir enviar mensajes."
            );

        }

        const guildConfig = getGuildConfig(interaction.guild.id);

        guildConfig.bienvenidas = channel.id;

        saveConfig();

        await interaction.reply({

            content:
                `✅ El canal de bienvenida se configuró correctamente.\n\n` +
                `📢 Canal: ${channel}`,

            ephemeral: true

        });

        log(`Canal de bienvenida configurado en ${interaction.guild.name}.`);

    } catch (err) {

        console.error("Error en cmdSetChannelBienvenidas:");
        console.error(err);

        if (!interaction.replied && !interaction.deferred) {

            await interaction.reply({

                content: "❌ Ocurrió un error al configurar el canal.",

                ephemeral: true

            });

        }

    }

}

/* ==========================
    SetWelcomeMessage
========================== */

/**
 * Comando /setwelcomemessage
 */
async function cmdSetWelcomeMessage(interaction) {

    try {

        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {

            return placeholder(
                interaction,
                "❌ Necesitas el permiso **Administrador** para usar este comando."
            );

        }

        const message = interaction.options.getString("mensaje");

        if (!message) {

            return placeholder(
                interaction,
                "❌ Debes escribir un mensaje."
            );

        }

        const guildConfig = getGuildConfig(interaction.guild.id);

        guildConfig.bienvenidasMessage = message;

        saveConfig();

        await interaction.reply({

            embeds: [

                new EmbedBuilder()

                    .setColor(0x57F287)

                    .setTitle("✅ Mensaje de bienvenida actualizado")

                    .setDescription(
                        [
                            "**Nuevo mensaje:**",
                            "",
                            `>>> ${message}`,
                            "",
                            "**Placeholders disponibles:**",
                            "`{user}` • Menciona al usuario",
                            "`{username}` • Nombre del usuario",
                            "`{server}` • Nombre del servidor",
                            "`{avatar}` • URL del avatar",
                            "`{banner}` • URL del banner"
                        ].join("\n")
                    )

                    .setTimestamp()

            ],

            ephemeral: true

        });

        log(`Mensaje de bienvenida actualizado en ${interaction.guild.name}.`);

    } catch (err) {

        console.error("Error en cmdSetWelcomeMessage:");
        console.error(err);

        if (!interaction.replied && !interaction.deferred) {

            await interaction.reply({

                content: "❌ Ocurrió un error al guardar el mensaje.",

                ephemeral: true

            });

        }

    }

}

/* ==========================
       SetWelcomeURL
========================== */

/**
 * Comando /setwelcomeurl
 */
async function cmdSetWelcomeURL(interaction) {

    try {

        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {

            return placeholder(
                interaction,
                "❌ Necesitas el permiso **Administrador** para usar este comando."
            );

        }

        const url = interaction.options.getString("url");

        if (!isValidUrl(url)) {

            return placeholder(
                interaction,
                "❌ Debes proporcionar una URL válida (https://...)."
            );

        }

        const guildConfig = getGuildConfig(interaction.guild.id);

        guildConfig.bienvenidasUrl = url;

        saveConfig();

        await interaction.reply({

            embeds: [

                new EmbedBuilder()

                    .setColor(0x57F287)

                    .setTitle("✅ URL de bienvenida actualizada")

                    .setDescription(
                        `La URL del botón de bienvenida ahora es:\n\n${url}`
                    )

                    .setTimestamp()

            ],

            ephemeral: true

        });

        log(`URL de bienvenida actualizada en ${interaction.guild.name}.`);

    } catch (err) {

        console.error("Error en cmdSetWelcomeURL:");
        console.error(err);

        if (!interaction.replied && !interaction.deferred) {

            await interaction.reply({

                content: "❌ Ocurrió un error al guardar la URL.",

                ephemeral: true

            });

        }

    }

}

/* ==========================
   SetChannelDespedidas
========================== */

/**
 * Comando /setchanneldespedidas
 */
async function cmdSetChannelDespedidas(interaction) {

    try {

        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {

            return placeholder(
                interaction,
                "❌ Necesitas el permiso **Administrador** para usar este comando."
            );

        }

        const channel = interaction.options.getChannel("canal");

        if (!channel) {

            return placeholder(
                interaction,
                "❌ Debes seleccionar un canal."
            );

        }

        if (!channel.isTextBased()) {

            return placeholder(
                interaction,
                "❌ El canal debe permitir enviar mensajes."
            );

        }

        const guildConfig = getGuildConfig(interaction.guild.id);

        guildConfig.despedidas = channel.id;

        saveConfig();

        await interaction.reply({

            embeds: [

                new EmbedBuilder()

                    .setColor(0x57F287)

                    .setTitle("✅ Canal de despedidas actualizado")

                    .setDescription(
                        `Las despedidas se enviarán en ${channel}.`
                    )

                    .setTimestamp()

            ],

            ephemeral: true

        });

        log(`Canal de despedidas configurado en ${interaction.guild.name}.`);

    } catch (err) {

        console.error("Error en cmdSetChannelDespedidas:");
        console.error(err);

        if (!interaction.replied && !interaction.deferred) {

            await interaction.reply({

                content: "❌ Ocurrió un error al configurar el canal.",

                ephemeral: true

            });

        }

    }

}

/* ==========================
    SetFarewellMessage
========================== */

/**
 * Comando /setfarewellmessage
 */
async function cmdSetFarewellMessage(interaction) {

    try {

        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {

            return placeholder(
                interaction,
                "❌ Necesitas el permiso **Administrador** para usar este comando."
            );

        }

        const message = interaction.options.getString("mensaje");

        if (!message) {

            return placeholder(
                interaction,
                "❌ Debes escribir un mensaje."
            );

        }

        if (message.length > 2000) {

            return placeholder(
                interaction,
                "❌ El mensaje no puede superar los 2000 caracteres."
            );

        }

        const guildConfig = getGuildConfig(interaction.guild.id);

        guildConfig.despedidasMessage = message;

        saveConfig();

        await interaction.reply({

            embeds: [

                new EmbedBuilder()

                    .setColor(0xED4245)

                    .setTitle("✅ Mensaje de despedida actualizado")

                    .setDescription(
                        [
                            "**Nuevo mensaje:**",
                            "",
                            `>>> ${message}`,
                            "",
                            "**Placeholders disponibles:**",
                            "`{user}` • Menciona al usuario",
                            "`{username}` • Nombre del usuario",
                            "`{server}` • Nombre del servidor",
                            "`{avatar}` • URL del avatar",
                            "`{banner}` • URL del banner"
                        ].join("\n")
                    )

                    .setTimestamp()

            ],

            ephemeral: true

        });

        log(`Mensaje de despedida actualizado en ${interaction.guild.name}.`);

    } catch (err) {

        console.error("Error en cmdSetFarewellMessage:");
        console.error(err);

        if (!interaction.replied && !interaction.deferred) {

            await interaction.reply({

                content: "❌ Ocurrió un error al guardar el mensaje.",

                ephemeral: true

            });

        }

    }

}

/* ==========================
       SetFarewellURL
========================== */

/**
 * Comando /setfarewellurl
 */
async function cmdSetFarewellURL(interaction) {

    try {

        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {

            return placeholder(
                interaction,
                "❌ Necesitas el permiso **Administrador** para usar este comando."
            );

        }

        const url = interaction.options.getString("url");

        if (!isValidUrl(url)) {

            return placeholder(
                interaction,
                "❌ Debes proporcionar una URL válida (https://...)."
            );

        }

        const guildConfig = getGuildConfig(interaction.guild.id);

        guildConfig.despedidasUrl = url;

        saveConfig();

        await interaction.reply({

            embeds: [

                new EmbedBuilder()

                    .setColor(0xED4245)

                    .setTitle("✅ URL de despedida actualizada")

                    .setDescription(
                        `La URL del botón de despedida ahora es:\n\n${url}`
                    )

                    .setTimestamp()

            ],

            ephemeral: true

        });

        log(`URL de despedida actualizada en ${interaction.guild.name}.`);

    } catch (err) {

        console.error("Error en cmdSetFarewellURL:");
        console.error(err);

        if (!interaction.replied && !interaction.deferred) {

            await interaction.reply({

                content: "❌ Ocurrió un error al guardar la URL.",

                ephemeral: true

            });

        }

    }

}

/* ==========================
      SetChannelBoost
========================== */

/**
 * Comando /setchannelboost
 */
async function cmdSetChannelBoost(interaction) {

    try {

        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {

            return placeholder(
                interaction,
                "❌ Necesitas el permiso **Administrador** para usar este comando."
            );

        }

        const channel = interaction.options.getChannel("canal");

        if (!channel) {

            return placeholder(
                interaction,
                "❌ Debes seleccionar un canal."
            );

        }

        if (!channel.isTextBased()) {

            return placeholder(
                interaction,
                "❌ El canal debe permitir enviar mensajes."
            );

        }

        const guildConfig = getGuildConfig(interaction.guild.id);

        guildConfig.boost = channel.id;

        saveConfig();

        await interaction.reply({

            embeds: [

                new EmbedBuilder()

                    .setColor(0xFF73FA)

                    .setTitle("✅ Canal de boosts actualizado")

                    .setDescription(
                        `Los mensajes de boost se enviarán en ${channel}.`
                    )

                    .setTimestamp()

            ],

            ephemeral: true

        });

        log(`Canal de boosts configurado en ${interaction.guild.name}.`);

    } catch (err) {

        console.error("Error en cmdSetChannelBoost:");
        console.error(err);

        if (!interaction.replied && !interaction.deferred) {

            await interaction.reply({

                content: "❌ Ocurrió un error al configurar el canal.",

                ephemeral: true

            });

        }

    }

}

/* ==========================
      SetBoostMessage
========================== */

/**
 * Comando /setboostmessage
 */
async function cmdSetBoostMessage(interaction) {

    try {

        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {

            return placeholder(
                interaction,
                "❌ Necesitas el permiso **Administrador** para usar este comando."
            );

        }

        const message = interaction.options.getString("mensaje");

        if (!message) {

            return placeholder(
                interaction,
                "❌ Debes escribir un mensaje."
            );

        }

        if (message.length > 2000) {

            return placeholder(
                interaction,
                "❌ El mensaje no puede superar los 2000 caracteres."
            );

        }

        const guildConfig = getGuildConfig(interaction.guild.id);

        guildConfig.boostMessage = message;

        saveConfig();

        await interaction.reply({

            embeds: [

                new EmbedBuilder()

                    .setColor(0xFF73FA)

                    .setTitle("✅ Mensaje de boost actualizado")

                    .setDescription(
                        [
                            "**Nuevo mensaje:**",
                            "",
                            `>>> ${message}`,
                            "",
                            "**Placeholders disponibles:**",
                            "`{user}` • Menciona al usuario",
                            "`{username}` • Nombre del usuario",
                            "`{server}` • Nombre del servidor",
                            "`{avatar}` • URL del avatar",
                            "`{banner}` • URL del banner"
                        ].join("\n")
                    )

                    .setTimestamp()

            ],

            ephemeral: true

        });

        log(`Mensaje de boost actualizado en ${interaction.guild.name}.`);

    } catch (err) {

        console.error("Error en cmdSetBoostMessage:");
        console.error(err);

        if (!interaction.replied && !interaction.deferred) {

            await interaction.reply({

                content: "❌ Ocurrió un error al guardar el mensaje.",

                ephemeral: true

            });

        }

    }

}

/* ==========================
        SetBoostURL
========================== */

/**
 * Comando /setboosturl
 */
async function cmdSetBoostURL(interaction) {

    try {

        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {

            return placeholder(
                interaction,
                "❌ Necesitas el permiso **Administrador** para usar este comando."
            );

        }

        const url = interaction.options.getString("url");

        if (!isValidUrl(url)) {

            return placeholder(
                interaction,
                "❌ Debes proporcionar una URL válida (https://...)."
            );

        }

        const guildConfig = getGuildConfig(interaction.guild.id);

        guildConfig.boostUrl = url;

        saveConfig();

        await interaction.reply({

            embeds: [

                new EmbedBuilder()

                    .setColor(0xFF73FA)

                    .setTitle("✅ URL de boost actualizada")

                    .setDescription(
                        `La URL del botón de boost ahora es:\n\n${url}`
                    )

                    .setTimestamp()

            ],

            ephemeral: true

        });

        log(`URL de boost actualizada en ${interaction.guild.name}.`);

    } catch (err) {

        console.error("Error en cmdSetBoostURL:");
        console.error(err);

        if (!interaction.replied && !interaction.deferred) {

            await interaction.reply({

                content: "❌ Ocurrió un error al guardar la URL.",

                ephemeral: true

            });

        }

    }

}

/* ==========================
           Ticket
========================== */

/**
 * Comando /ticket
 */
async function cmdTicket(interaction) {

    try {

        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {

            return placeholder(
                interaction,
                "❌ Necesitas el permiso **Administrador** para usar este comando."
            );

        }

        const embed = new EmbedBuilder()

            .setColor(0x5865F2)

            .setTitle("🎫 Centro de Soporte")

            .setDescription(
                [
                    "¿Necesitas ayuda?",
                    "",
                    "Pulsa el botón de abajo para crear un ticket privado.",
                    "",
                    "Un miembro del equipo te atenderá lo antes posible."
                ].join("\n")
            )

            // Puedes cambiar esta URL por el banner que quieras
            .setImage("https://TU-BANNER-AQUI.png")

            .setFooter({

                text: interaction.guild.name,

                iconURL: interaction.guild.iconURL()

            })

            .setTimestamp();

        const row = new ActionRowBuilder()

            .addComponents(

                new ButtonBuilder()

                    .setCustomId("ticket_create")

                    .setLabel("Crear Ticket")

                    .setEmoji("🎫")

                    .setStyle(ButtonStyle.Primary)

            );

        await interaction.reply({

            embeds: [embed],

            components: [row]

        });

        log(`Panel de tickets enviado en ${interaction.guild.name}.`);

    } catch (err) {

        console.error("Error en cmdTicket:");
        console.error(err);

        if (!interaction.replied && !interaction.deferred) {

            await interaction.reply({

                content: "❌ Ocurrió un error al enviar el panel de tickets.",

                ephemeral: true

            });

        }

    }

}

/* ==========================
     Función Principal
========================== */

/**
 * Maneja todos los Slash Commands.
 */
async function handleSlashCommands(interaction, client) {

    try {

        switch (interaction.commandName) {

            /* ==========================
                    Generales
            ========================== */

            case "ping":
                return await cmdPing(interaction);

            case "help":
                return await cmdHelp(interaction);

            /* ==========================
                Bienvenidas
            ========================== */

            case "setchannelbienvenidas":
                return await cmdSetChannelBienvenidas(interaction);

            case "setwelcomemessage":
                return await cmdSetWelcomeMessage(interaction);

            case "setwelcomeurl":
                return await cmdSetWelcomeURL(interaction);

            /* ==========================
                 Despedidas
            ========================== */

            case "setchanneldespedidas":
                return await cmdSetChannelDespedidas(interaction);

            case "setfarewellmessage":
                return await cmdSetFarewellMessage(interaction);

            case "setfarewellurl":
                return await cmdSetFarewellURL(interaction);

            /* ==========================
                    Boost
            ========================== */

            case "setchannelboost":
                return await cmdSetChannelBoost(interaction);

            case "setboostmessage":
                return await cmdSetBoostMessage(interaction);

            case "setboosturl":
                return await cmdSetBoostURL(interaction);

            /* ==========================
                   Tickets
            ========================== */

            case "ticket":
                return await cmdTicket(interaction);

            default:

                return interaction.reply({

                    content: "❌ Ese comando aún no está implementado.",

                    ephemeral: true

                });

        }

    } catch (err) {

        console.error("Error en handleSlashCommands:");
        console.error(err);

        if (
            interaction.isRepliable() &&
            !interaction.replied &&
            !interaction.deferred
        ) {

            await interaction.reply({

                content: "❌ Ocurrió un error al ejecutar este comando.",

                ephemeral: true

            });

        }

    }

}

/* ==========================
        executeLogic
========================== */

/**
 * Punto de entrada principal de las interacciones.
 */
export async function executeLogic(interaction, client) {

    try {

        if (interaction.isButton()) {

            return await handleButtons(interaction);

        }

        if (interaction.isChatInputCommand()) {

            return await handleSlashCommands(interaction, client);

        }

    } catch (err) {

        console.error("Error en executeLogic:");
        console.error(err);

        if (
            interaction.isRepliable() &&
            !interaction.replied &&
            !interaction.deferred
        ) {

            await interaction.reply({

                content: "❌ Ocurrió un error interno.",

                ephemeral: true

            });

        }

    }

}

/* ==========================
          EXPORTS
========================== */
