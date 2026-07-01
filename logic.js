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
    ButtonStyle,
    ChannelSelectMenuBuilder,
    StringSelectMenuBuilder
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

/* ==========================
      INICIALIZACIÓN
========================== */

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

        config = JSON.parse(

            fs.readFileSync(CONFIG_PATH, "utf8")

        );

    }

    catch {

        console.log("⚠️ config.json corrupto. Restaurando...");

        config = {

            channels: {},
            counters: {}

        };

        saveConfig();

    }

    config.channels ??= {};
    config.counters ??= {};

}

function saveConfig() {

    try {

        fs.writeFileSync(

            CONFIG_PATH,
            JSON.stringify(config, null, 4),
            "utf8"

        );

        console.log("✅ config.json guardado correctamente");

    }

    catch (err) {

        console.error("❌ Error guardando config.json:", err);

    }

}

/* ==========================
       FUNCIONES
========================== */

function placeholder(interaction, text = "🚧 Este sistema aún no está implementado.") {

    return interaction.reply({

        content: text,

        ephemeral: true

    });

}

/* ==========================
           LÓGICA
========================== */

export async function executeLogic(interaction, client) {

    /* ==========================
        SELECT MENUS
    ========================== */

    if (

        interaction.isChannelSelectMenu() ||

        interaction.isStringSelectMenu()

    ) {

        return handleChannelMenus(interaction);

    }

    /* ==========================
           BOTONES
    ========================== */

    if (interaction.isButton()) {

        return handleButtons(interaction);

    }

    /* ==========================
           MODALES
    ========================== */

    if (interaction.isModalSubmit()) {

        return handleModals(interaction);

    }

    /* ==========================
        SLASH COMMANDS
    ========================== */

    if (!interaction.isChatInputCommand())

        return;

    return handleSlashCommands(

        interaction,

        client

    );

}

/* ==========================
      SELECT MENUS
========================== */

async function handleChannelMenus(interaction) {

    switch (interaction.customId) {

/* ==========================
      SET TICKETS CHANNEL
========================== */

case "set_tickets_channel": {

    config.channels[interaction.guild.id] ??= {};

    config.channels[interaction.guild.id].tickets = interaction.values[0];

    saveConfig();

    const channel = interaction.guild.channels.cache.get(
        interaction.values[0]
    );

    const embed = new EmbedBuilder()

        .setColor(0x5865F2)

        .setTitle("🎫 Sistema de Tickets")

        .setDescription(
`¿Necesitas ayuda?

Pulsa el botón de abajo para abrir un ticket.

Nuestro equipo te atenderá lo antes posible.`
        )

        .setFooter({

            text: "Gaburon • Sistema de Tickets"

        });

    const row = new ActionRowBuilder()

        .addComponents(

            new ButtonBuilder()

                .setCustomId("ticket_create")

                .setEmoji("🎫")

                .setLabel("Crear Ticket")

                .setStyle(ButtonStyle.Primary)

        );

    await channel.send({

        embeds: [embed],

        components: [row]

    });

    return interaction.update({

        content:
`✅ Canal configurado correctamente.

📍 Canal:
<#${interaction.values[0]}>

El panel de tickets fue enviado correctamente.`,

        components: []

    });

}
        
        /* ==========================
            DESCONOCIDO
        ========================== */

        default: {

            return interaction.reply({

                content: "❌ Menú desconocido.",

                ephemeral: true

            });

        }

    }

}

/* ==========================
          BOTONES
========================== */

async function handleButtons(interaction) {

    switch (interaction.customId) {

        /* ==========================
          CREAR TICKET
        ========================== */

        case "ticket_create": {

            return placeholder(

                interaction,

                "🎫 Sistema de tickets en desarrollo."

            );

        }

        /* ==========================
         ACEPTAR TICKET
        ========================== */

        case "ticket_accept": {

            return placeholder(

                interaction,

                "✅ Sistema de aceptación en desarrollo."

            );

        }

        /* ==========================
        RECHAZAR TICKET
        ========================== */

        case "ticket_reject": {

            return placeholder(

                interaction,

                "❌ Sistema de rechazo en desarrollo."

            );

        }

        /* ==========================
          CERRAR TICKET
        ========================== */

        case "ticket_close": {

            return placeholder(

                interaction,

                "🔒 Sistema de cierre en desarrollo."

            );

        }

        /* ==========================
            DESCONOCIDO
        ========================== */

        default: {

            return interaction.reply({

                content: "❌ Botón desconocido.",

                ephemeral: true

            });

        }

    }

}

/* ==========================
          MODALES
========================== */

async function handleModals(interaction) {

    switch (interaction.customId) {

        /* ==========================
            DESCONOCIDO
        ========================== */

        default: {

            return interaction.reply({

                content: "❌ Formulario desconocido.",

                ephemeral: true

            });

        }

    }

}

/* ==========================
      SLASH COMMANDS
========================== */

async function handleSlashCommands(interaction, client) {

    switch (interaction.commandName) {

        /* ==========================
            CONFIGURACIÓN
        ========================== */

/* ==========================
      SET CHANNEL TICKETS
========================== */

case "setchanneltickets": {

    if (!interaction.member.permissions.has(
        PermissionsBitField.Flags.Administrator
    )) {

        return interaction.reply({

            content: "❌ Solo los administradores pueden usar este comando.",

            ephemeral: true

        });

    }

    const row = new ActionRowBuilder()

        .addComponents(

            new ChannelSelectMenuBuilder()

                .setCustomId("set_tickets_channel")

                .setPlaceholder("Selecciona el canal de tickets")

                .setChannelTypes(ChannelType.GuildText)

                .setMinValues(1)

                .setMaxValues(1)

        );

    const currentChannel =
        config.channels?.[interaction.guild.id]?.tickets;

    return interaction.reply({

        content: currentChannel

            ? `📍 Canal actual:\n<#${currentChannel}>\n\nSelecciona otro canal si deseas cambiarlo.`

            : "🎫 Selecciona el canal donde se enviará el panel de tickets.",

        components: [row],

        ephemeral: true

    });

}

        case "setchannelanuncios": {

            return placeholder(
                interaction,
                "📢 Configuración de anuncios en desarrollo."
            );

        }

        case "setchannelcastigos": {

            return placeholder(
                interaction,
                "⚠️ Configuración de castigos en desarrollo."
            );

        }

        case "setchannelbienvenidas": {

            return placeholder(
                interaction,
                "👋 Configuración de bienvenidas en desarrollo."
            );

        }

        case "setchanneldespedidas": {

            return placeholder(
                interaction,
                "📤 Configuración de despedidas en desarrollo."
            );

        }

        case "setchannelalianzas": {

            return placeholder(
                interaction,
                "🤝 Configuración de alianzas en desarrollo."
            );

        }

        case "setchannelboost": {

            return placeholder(
                interaction,
                "🚀 Configuración de boosts en desarrollo."
            );

        }

        /* ==========================
               TICKETS
        ========================== */

        case "ticket": {

            return placeholder(
                interaction,
                "🎫 Sistema de tickets en desarrollo."
            );

        }

        /* ==========================
             CONTADORES
        ========================== */

        case "createhuman": {

            return placeholder(
                interaction,
                "👤 Contador de usuarios en desarrollo."
            );

        }

        case "createbot": {

            return placeholder(
                interaction,
                "🤖 Contador de bots en desarrollo."
            );

        }

        /* ==========================
             MODERACIÓN
        ========================== */

        case "castigar": {

            return placeholder(
                interaction,
                "⚠️ Sistema de castigos en desarrollo."
            );

        }

        /* ==========================
              ANUNCIOS
        ========================== */

        case "anuncio": {

            return placeholder(
                interaction,
                "📢 Sistema de anuncios en desarrollo."
            );

        }

        /* ==========================
              ALIANZAS
        ========================== */

        case "alianza": {

            return placeholder(
                interaction,
                "🤝 Sistema de alianzas en desarrollo."
            );

        }

        /* ==========================
             DESCONOCIDO
        ========================== */

        default: {

            return interaction.reply({

                content: "❌ Comando desconocido.",

                ephemeral: true

            });

        }

    }

}

