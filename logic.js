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
           LÓGICA
========================== */

/* ==========================
          BOTONES
========================== */

/* ==========================
      SLASH COMMANDS
========================== */

/* ==========================
          EXPORTS
========================== */
