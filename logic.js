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
 */

function formatTemplate(template, member) {

    if (!template)
        return "";

    return template
        .replaceAll("{user}", `<@${member.id}>`)
        .replaceAll("{username}", member.user.username)
        .replaceAll("{server}", member.guild.name);

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

        if (
            parsed.protocol !== "https:" &&
            parsed.protocol !== "http:"
        )
            return false;

        return true;

    } catch {

        return false;

    }

}

/* ==========================
      RESOLVER IMÁGENES
========================== */

/**
 * Convierte enlaces de imágenes o GIFs a una URL compatible con Discord.
 * Compatible con:
 * - Tenor (view, es-US/view, .gif)
 * - Giphy
 * - Discord CDN
 * - Imgur
 * - GitHub
 * - Catbox
 * - ImgBB
 * - Postimages
 * - Cualquier imagen pública
 */
async function resolveImageUrl(url) {

    if (!url)
        return null;

    url = url.trim();

    try {

        // Comprobar URL válida
        new URL(url);

        // Si ya parece una imagen directa
        if (/^https?:\/\/.+\.(gif|png|jpe?g|webp)(\?.*)?$/i.test(url))
            return url;

        const response = await fetch(url, {
            method: "GET",
            redirect: "follow",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/137 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml,image/webp,image/apng,*/*",
                "Accept-Language": "es-ES,es;q=0.9,en;q=0.8"
            }
        });

        if (!response.ok)
            return null;

        const contentType = response.headers.get("content-type") || "";

        // Si terminó siendo una imagen
        if (contentType.startsWith("image/"))
            return response.url;

        // Si no es HTML devolver la URL final
        if (!contentType.includes("text/html"))
            return response.url;

        const html = await response.text();

        // ==========================
        // META TAGS
        // ==========================

        const metaPatterns = [

            /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"]+)["']/i,

            /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"]+)["']/i,

            /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"]+)["']/i,

            /<meta[^>]+property=["']twitter:image["'][^>]+content=["']([^"]+)["']/i

        ];

        for (const regex of metaPatterns) {

            const match = html.match(regex);

            if (match?.[1])
                return match[1]
                    .replace(/\\\//g, "/")
                    .replace(/&amp;/g, "&");

        }

        // ==========================
        // TENOR (JSON moderno)
        // ==========================

        const tenorPatterns = [

            /"contentUrl":"(https:\\\/\\\/media\.tenor\.com\\\/[^"]+)"/i,

            /"url":"(https:\\\/\\\/media\.tenor\.com\\\/[^"]+\.(?:gif|png|jpg|jpeg|webp))"/i,

            /"image":"(https:\\\/\\\/media\.tenor\.com\\\/[^"]+)"/i,

            /(https:\/\/media\.tenor\.com\/[^"' ]+\.(?:gif|png|jpg|jpeg|webp))/i

        ];

        for (const regex of tenorPatterns) {

            const match = html.match(regex);

            if (match?.[1])
                return match[1]
                    .replace(/\\\//g, "/")
                    .replace(/&amp;/g, "&");

        }

        // ==========================
        // Cualquier imagen encontrada
        // ==========================

        const img = html.match(
            /https?:\/\/[^"' ]+\.(gif|png|jpg|jpeg|webp)(\?[^"' ]*)?/i
        );

        if (img)
            return img[0];

        // ==========================
        // <img src="">
        // ==========================

        const src = html.match(
            /<img[^>]+src=["']([^"']+)["']/i
        );

        if (src?.[1]) {

            try {
                return new URL(src[1], response.url).href;
            } catch {}

        }

        return response.url || url;

    } catch (err) {

        console.error("[resolveImageUrl]", err);

        return null;

    }

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

    const data = getGuildConfig(member.guild.id).welcome;

    if (!data?.channel)
        return;

    const channel = member.guild.channels.cache.get(data.channel);

    if (!channel)
        return;

    const embed = new EmbedBuilder()

        .setColor(0x57F287)

        .setTitle("sistema gaburon|Bienvenida")

        .setDescription(
            formatTemplate(
                data.message ??
                "¡Bienvenido {user}!",
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

    if (data.banner)
        embed.setImage(data.banner);

    await channel.send({
        embeds: [embed]
    });

}

/* ==========================
     Función: sendFarewell
========================== */

/**
 * Envía el mensaje de despedida.
 */
export async function sendFarewell(member) {

    const data = getGuildConfig(member.guild.id).farewell;

    if (!data?.channel)
        return;

    const channel = member.guild.channels.cache.get(data.channel);

    if (!channel)
        return;

    const embed = new EmbedBuilder()

        .setColor(0xED4245)

        .setTitle("sistema gaburon|Despedida")

        .setDescription(
            formatTemplate(
                data.message ??
                "{user} abandonó el servidor.",
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

    if (data.banner)
        embed.setImage(data.banner);

    await channel.send({
        embeds: [embed]
    });

}
/* ==========================
      Función: handleBoost
========================== */

/**
 * Envía el mensaje cuando un usuario impulsa el servidor.
 */
export async function handleBoost(oldMember, newMember) {

    if (oldMember.premiumSince === newMember.premiumSince)
        return;

    if (!newMember.premiumSince)
        return;

    const data = getGuildConfig(newMember.guild.id).boost;

    if (!data?.channel)
        return;

    const channel = newMember.guild.channels.cache.get(data.channel);

    if (!channel)
        return;

    const embed = new EmbedBuilder()

        .setColor(0xF47FFF)

        .setTitle("sistema gaburon|mejora de servidor")

        .setDescription(
            formatTemplate(
                data.message ??
                "¡{user} impulsó el servidor!",
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

    if (data.banner)
        embed.setImage(data.banner);

    await channel.send({
        embeds: [embed]
    });

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
        "👥 exploradores",
        guild.memberCount
    );

    await ensureCounterChannel(
        guild,
        "bots",
        "🤖 automatas",
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

            .setTitle("📖 Centro de ayuda | Gaburon")

            .setDescription(
                [
                    "¡Hola! Estos son los comandos disponibles actualmente.",
                    "",
                    "**⚙️ Configuración**",
                    "• `/setchannelbienvenidas` → Configura el canal de bienvenida.",
                    "• `/setwelcome` → Configura el mensaje y banner de bienvenida.",
                    "",
                    "• `/setchanneldespedidas` → Configura el canal de despedida.",
                    "• `/setfarewell` → Configura el mensaje y banner de despedida.",
                    "",
                    "• `/setchannelboost` → Configura el canal de boosts.",
                    "• `/setboost` → Configura el mensaje y banner de boost.",
                    "",
                    "**🎫 Tickets**",
                    "• `/ticket` → Envía el panel para crear tickets.",
                    "",
                    "**🔧 Utilidades**",
                    "• `/ping` → Muestra la latencia del bot.",
                    "• `/help` → Muestra este menú.",
                    "",
                    "**📝 Placeholders**",
                    "• `{user}` → Menciona al usuario.",
                    "• `{username}` → Nombre del usuario.",
                    "• `{server}` → Nombre del servidor.",
                    "",
                    "**💡 Ejemplo**",
                    "`¡Bienvenido {user} a {server}!`"
                ].join("\n")
            )

            .setThumbnail(
                interaction.client.user.displayAvatarURL({
                    extension: "png",
                    size: 1024
                })
            )

            .setFooter({
                text: "Gaburon"
            })

            .setTimestamp();

        await interaction.reply({
            embeds: [embed]
        });

    } catch (err) {

        console.error("Error en cmdHelp:", err);

        if (!interaction.replied && !interaction.deferred) {

            await interaction.reply({
                content: "❌ Ocurrió un error al mostrar la ayuda.",
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

        guildConfig.welcome ??= {};

        // Guardar el canal donde realmente lo busca sendWelcome()
        guildConfig.welcome.channel = channel.id;

        // Compatibilidad con configuraciones antiguas
        guildConfig.bienvenidas = channel.id;

        saveConfig();

        const embed = new EmbedBuilder()

            .setColor(0x57F287)

            .setTitle("✅ Canal de bienvenida actualizado")

            .setDescription(
                `Los mensajes de bienvenida se enviarán en ${channel}.`
            )

            .setFooter({
                text: interaction.guild.name
            })

            .setTimestamp();

        await interaction.reply({

            embeds: [embed],

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
        SetWelcome
========================== */

async function cmdSetWelcome(interaction) {

    try {

        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {

            return placeholder(
                interaction,
                "❌ Necesitas el permiso **Administrador**."
            );

        }

        const guildConfig = getGuildConfig(interaction.guild.id);

        guildConfig.welcome ??= {};

        // Mantener el canal ya configurado
        if (!guildConfig.welcome.channel && guildConfig.bienvenidas) {
            guildConfig.welcome.channel = guildConfig.bienvenidas;
        }

        const mensaje = interaction.options.getString("mensaje");
        let banner = interaction.options.getString("banner");

        // Guardar mensaje
        if (mensaje) {
            guildConfig.welcome.message = mensaje;
        }

        // Guardar banner
        if (banner) {

            banner = await resolveImageUrl(banner);

            if (!banner) {

                return placeholder(
                    interaction,
                    "❌ No pude obtener la imagen del enlace."
                );

            }

            if (!isValidUrl(banner)) {

                return placeholder(
                    interaction,
                    "❌ La URL obtenida no es válida."
                );

            }

            guildConfig.welcome.banner = banner;

        }

        saveConfig();

        const embed = new EmbedBuilder()

            .setColor(0x57F287)

            .setTitle("✅ Bienvenida configurada")

            .setDescription(
                [
                    guildConfig.welcome.channel
                        ? `📢 Canal: <#${guildConfig.welcome.channel}>`
                        : "⚠️ Aún no has configurado un canal.",

                    mensaje
                        ? "💬 Mensaje actualizado."
                        : "💬 Mensaje sin cambios.",

                    banner
                        ? "🖼️ Banner actualizado."
                        : "🖼️ Banner sin cambios."
                ].join("\n")
            )

            .setTimestamp();

        if (guildConfig.welcome.banner) {
            embed.setImage(guildConfig.welcome.banner);
        }

        await interaction.reply({

            embeds: [embed],

            ephemeral: true

        });

    } catch (err) {

        console.error("Error en cmdSetWelcome:");
        console.error(err);

        if (!interaction.replied && !interaction.deferred) {

            await interaction.reply({

                content: "❌ Ocurrió un error al configurar la bienvenida.",

                ephemeral: true

            });

        }

    }

}

/* ==========================
       SetWelcomeURL
========================== */



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

        guildConfig.farewell ??= {};

        // Guardar donde realmente lo busca sendFarewell()
        guildConfig.farewell.channel = channel.id;

        // Compatibilidad con configuraciones antiguas
        guildConfig.despedidas = channel.id;

        saveConfig();

        const embed = new EmbedBuilder()

            .setColor(0xED4245)

            .setTitle("✅ Canal de despedidas actualizado")

            .setDescription(
                `Los mensajes de despedida se enviarán en ${channel}.`
            )

            .setFooter({
                text: interaction.guild.name
            })

            .setTimestamp();

        await interaction.reply({

            embeds: [embed],

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
        SetFarewell
========================== */

async function cmdSetFarewell(interaction) {

    try {

        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {

            return placeholder(
                interaction,
                "❌ Necesitas el permiso **Administrador**."
            );

        }

        const guildConfig = getGuildConfig(interaction.guild.id);

        guildConfig.farewell ??= {};

        // Mantener el canal configurado anteriormente
        if (!guildConfig.farewell.channel && guildConfig.despedidas) {
            guildConfig.farewell.channel = guildConfig.despedidas;
        }

        const mensaje = interaction.options.getString("mensaje");
        let banner = interaction.options.getString("banner");

        // Guardar mensaje
        if (mensaje) {
            guildConfig.farewell.message = mensaje;
        }

        // Guardar banner
        if (banner) {

            banner = await resolveImageUrl(banner);

            if (!banner) {

                return placeholder(
                    interaction,
                    "❌ No pude obtener la imagen del enlace."
                );

            }

            if (!isValidUrl(banner)) {

                return placeholder(
                    interaction,
                    "❌ La URL obtenida no es válida."
                );

            }

            guildConfig.farewell.banner = banner;

        }

        saveConfig();

        const embed = new EmbedBuilder()

            .setColor(0xED4245)

            .setTitle("✅ Despedida configurada")

            .setDescription(
                [
                    guildConfig.farewell.channel
                        ? `📢 Canal: <#${guildConfig.farewell.channel}>`
                        : "⚠️ Aún no has configurado un canal.",

                    mensaje
                        ? "💬 Mensaje actualizado."
                        : "💬 Mensaje sin cambios.",

                    banner
                        ? "🖼️ Banner actualizado."
                        : "🖼️ Banner sin cambios."
                ].join("\n")
            )

            .setTimestamp();

        if (guildConfig.farewell.banner) {
            embed.setImage(guildConfig.farewell.banner);
        }

        await interaction.reply({

            embeds: [embed],

            ephemeral: true

        });

    } catch (err) {

        console.error("Error en cmdSetFarewell:");
        console.error(err);

        if (!interaction.replied && !interaction.deferred) {

            await interaction.reply({

                content: "❌ Ocurrió un error al configurar la despedida.",

                ephemeral: true

            });

        }

    }

}

/* ==========================
       SetFarewellURL
========================== */



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

        // Si anteriormente boost era un string, convertirlo a objeto
        if (!guildConfig.boost || typeof guildConfig.boost !== "object") {
            guildConfig.boost = {};
        }

        // Guardar el canal donde realmente lo busca handleBoost()
        guildConfig.boost.channel = channel.id;

        saveConfig();

        const embed = new EmbedBuilder()

            .setColor(0xF47FFF)

            .setTitle("✅ Canal de boosts actualizado")

            .setDescription(
                `Los mensajes de boost se enviarán en ${channel}.`
            )

            .setFooter({
                text: interaction.guild.name
            })

            .setTimestamp();

        await interaction.reply({

            embeds: [embed],

            ephemeral: true

        });

        log(`Canal de boosts configurado en ${interaction.guild.name}.`);

    } catch (err) {

        console.error("Error en cmdSetChannelBoost:");
        console.error(err);

        if (!interaction.replied && !interaction.deferred) {

            await interaction.reply({

                content: "❌ Ocurrió un error al configurar el canal de boosts.",

                ephemeral: true

            });

        }

    }

}

/* ==========================
        SetBoost
========================== */

async function cmdSetBoost(interaction) {

    try {

        if (!interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {

            return placeholder(
                interaction,
                "❌ Necesitas el permiso **Administrador**."
            );

        }

        const guildConfig = getGuildConfig(interaction.guild.id);

        guildConfig.boost ??= {};

        // Mantener el canal configurado
        if (
            !guildConfig.boost.channel &&
            typeof guildConfig.boost !== "string"
        ) {
            // No hacer nada
        }

        const mensaje =
            interaction.options.getString("mensaje");

        let banner =
            interaction.options.getString("banner");

        // Guardar mensaje
        if (mensaje) {
            guildConfig.boost.message = mensaje;
        }

        // Guardar banner
        if (banner) {

            banner = await resolveImageUrl(banner);

            if (!banner) {

                return placeholder(
                    interaction,
                    "❌ No pude obtener la imagen del enlace."
                );

            }

            if (!isValidUrl(banner)) {

                return placeholder(
                    interaction,
                    "❌ La URL obtenida no es válida."
                );

            }

            guildConfig.boost.banner = banner;

        }

        saveConfig();

        const embed = new EmbedBuilder()

            .setColor(0xF47FFF)

            .setTitle("✅ Mensaje de boost configurado")

            .setDescription(
                [
                    guildConfig.boost.channel
                        ? `📢 Canal: <#${guildConfig.boost.channel}>`
                        : "⚠️ Aún no has configurado un canal de boosts.",

                    mensaje
                        ? "💬 Mensaje actualizado."
                        : "💬 Mensaje sin cambios.",

                    banner
                        ? "🖼️ Banner actualizado."
                        : "🖼️ Banner sin cambios."
                ].join("\n")
            )

            .setTimestamp();

        if (guildConfig.boost.banner) {
            embed.setImage(guildConfig.boost.banner);
        }

        await interaction.reply({

            embeds: [embed],

            ephemeral: true

        });

    } catch (err) {

        console.error("Error en cmdSetBoost:");
        console.error(err);

        if (!interaction.replied && !interaction.deferred) {

            await interaction.reply({

                content: "❌ Ocurrió un error al configurar el mensaje de boost.",

                ephemeral: true

            });

        }

    }

}

/* ==========================
        SetBoostURL
========================== */



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

            case "setwelcome":
                return await cmdSetWelcome(interaction);

            /* ==========================
                 Despedidas
            ========================== */

            case "setchanneldespedidas":
                return await cmdSetChannelDespedidas(interaction);

            case "setfarewell":
                return await cmdSetFarewell(interaction);
                            
            /* ==========================
                    Boost
            ========================== */

            case "setchannelboost":
                return await cmdSetChannelBoost(interaction);

            case "setboost":
                return await cmdSetBoost(interaction);
                            
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

export {

    config,

    ensureCounterChannel

};
