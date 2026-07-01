/* ==========================
          IMPORTS
========================== */

import fs from "fs";
import http from "http";
import express from "express";

import {
    Client,
    GatewayIntentBits,
    Events,
    REST,
    Routes,
    SlashCommandBuilder,
    ChannelType,
    PermissionsBitField
} from "discord.js";

import { executeLogic, config, saveConfig } from "./logic.js";

/* ==========================
           CONFIG
========================== */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const PORT = process.env.PORT || 3000;

/* ==========================
           CLIENT
========================== */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

/* ==========================
           EXPRESS
========================== */

const app = express();

app.get("/", (_, res) => {
    res.send("Gaburon operativo.");
});

app.get("/ping", (_, res) => {
    res.send("OK");
});

app.listen(PORT, () => {
    console.log(`🌐 Servidor iniciado (${PORT})`);
});

/* ==========================
         KEEP ALIVE
========================== */

setInterval(() => {
    http.get(`http://localhost:${PORT}/ping`).on("error", () => {});
}, 1000 * 60 * 5);

/* ==========================
        CARGAR CMD.JSON
========================== */

const cmdData = JSON.parse(fs.readFileSync("./cmd.json", "utf8"));
const commands = [];

for (const cmd of cmdData) {
    const builder = new SlashCommandBuilder()
        .setName(cmd.name)
        .setDescription(cmd.description);

    if (cmd.options) {
        for (const option of cmd.options) {
            switch (option.type) {
                case "string":
                    builder.addStringOption(o =>
                        o.setName(option.name).setDescription(option.description).setRequired(option.required)
                    );
                    break;
                case "user":
                    builder.addUserOption(o =>
                        o.setName(option.name).setDescription(option.description).setRequired(option.required)
                    );
                    break;
                case "channel":
                    builder.addChannelOption(o =>
                        o.setName(option.name).setDescription(option.description).setRequired(option.required)
                    );
                    break;
                case "boolean":
                    builder.addBooleanOption(o =>
                        o.setName(option.name).setDescription(option.description).setRequired(option.required)
                    );
                    break;
                case "integer":
                    builder.addIntegerOption(o =>
                        o.setName(option.name).setDescription(option.description).setRequired(option.required)
                    );
                    break;
                case "number":
                    builder.addNumberOption(o =>
                        o.setName(option.name).setDescription(option.description).setRequired(option.required)
                    );
                    break;
                case "role":
                    builder.addRoleOption(o =>
                        o.setName(option.name).setDescription(option.description).setRequired(option.required)
                    );
                    break;
                case "mentionable":
                    builder.addMentionableOption(o =>
                        o.setName(option.name).setDescription(option.description).setRequired(option.required)
                    );
                    break;
                case "attachment":
                    builder.addAttachmentOption(o =>
                        o.setName(option.name).setDescription(option.description).setRequired(option.required)
                    );
                    break;
            }
        }
    }

    commands.push(builder);
}

const rest = new REST({ version: "10" }).setToken(TOKEN);

/* ==========================
            READY
========================== */

client.once(Events.ClientReady, async () => {
    console.clear();
    console.log("========================================");
    console.log("🛡️ Iniciando Gaburon...");
    console.log("========================================");

    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

        console.log(`✅ Bot conectado: ${client.user.tag}`);
        console.log(`📦 Comandos registrados: ${commands.length}`);
        console.log("========================================");

        // Actualizar contadores al iniciar
        for (const guild of client.guilds.cache.values()) {
            updateCounters(guild);
        }
    } catch (err) {
        console.error("❌ Error registrando comandos:");
        console.error(err);
    }
});

/* ==========================
        INTERACCIONES
========================== */

client.on(Events.InteractionCreate, async interaction => {
    try {
        await executeLogic(interaction, client);
    } catch (err) {
        console.error("❌ Error en una interacción:");
        console.error(err);

        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: "❌ Ocurrió un error interno al ejecutar esta interacción.",
                ephemeral: true
            });
        }
    }
});

/* ==========================
   EVENTOS AUTOMÁTICOS
========================== */

client.on("guildMemberAdd", member => {
    updateCounters(member.guild);
});

client.on("guildMemberRemove", member => {
    updateCounters(member.guild);
});

async function updateCounters(guild) {
    const members = await guild.members.fetch();
    const humans = members.filter(m => !m.user.bot).size;
    const bots = members.filter(m => m.user.bot).size;

    // Buscar o crear categoría "Status"
    let category = guild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === "status"
    );
    if (!category) {
        category = await guild.channels.create({ name: "Status", type: ChannelType.GuildCategory });
    }

    // HUMANS
    const humanChannel = guild.channels.cache.get(config.counters.humans);
    if (humanChannel) {
        await humanChannel.setName(`👤 Humanos: ${humans}`);
    }

    // BOTS
    const botChannel = guild.channels.cache.get(config.counters.bots);
    if (botChannel) {
        await botChannel.setName(`🤖 Bots: ${bots}`);
    }
}

/* ==========================
            LOGIN
========================== */

client.login(TOKEN)
    .then(() => {
        console.log("🔑 Login realizado correctamente.");
    })
    .catch(err => {
        console.error("❌ Error iniciando sesión:");
        console.error(err);
    });
