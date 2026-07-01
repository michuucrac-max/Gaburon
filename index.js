/* ==========================
          IMPORTS
========================== */

import {
    Client,
    GatewayIntentBits,
    Events,
    REST,
    Routes,
    SlashCommandBuilder
} from "discord.js";

import fs from "fs";
import express from "express";
import http from "http";

import { executeLogic } from "./logic.js";

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
        EXPRESS SERVER
========================== */

const app = express();

app.get("/", (_, res) => {

    res.send("🛡️ Gaburon está en línea.");

});

app.get("/ping", (_, res) => {

    res.send("pong");

});

app.listen(PORT, () => {

    console.log(`🌐 Servidor iniciado en el puerto ${PORT}`);

});

/* ==========================
         KEEP ALIVE
========================== */

setInterval(() => {

    http.get(`http://localhost:${PORT}/ping`).on("error", () => {});

}, 1000 * 60 * 5);

/* ==========================
     REGISTRO DE COMANDOS
========================== */

const cmdData = JSON.parse(

    fs.readFileSync("./cmd.json", "utf8")

);

const commands = [];

for (const cmd of cmdData) {

    const builder = new SlashCommandBuilder()

        .setName(cmd.name)

        .setDescription(cmd.description);

    if (Array.isArray(cmd.options)) {

        for (const option of cmd.options) {

            switch (option.type) {

                case "string":

                    builder.addStringOption(o =>
                        o
                            .setName(option.name)
                            .setDescription(option.description)
                            .setRequired(option.required)
                    );

                    break;

                case "user":

                    builder.addUserOption(o =>
                        o
                            .setName(option.name)
                            .setDescription(option.description)
                            .setRequired(option.required)
                    );

                    break;

                case "channel":

                    builder.addChannelOption(o =>
                        o
                            .setName(option.name)
                            .setDescription(option.description)
                            .setRequired(option.required)
                    );

                    break;

                case "boolean":

                    builder.addBooleanOption(o =>
                        o
                            .setName(option.name)
                            .setDescription(option.description)
                            .setRequired(option.required)
                    );

                    break;

                case "integer":

                    builder.addIntegerOption(o =>
                        o
                            .setName(option.name)
                            .setDescription(option.description)
                            .setRequired(option.required)
                    );

                    break;

                case "number":

                    builder.addNumberOption(o =>
                        o
                            .setName(option.name)
                            .setDescription(option.description)
                            .setRequired(option.required)
                    );

                    break;

                case "role":

                    builder.addRoleOption(o =>
                        o
                            .setName(option.name)
                            .setDescription(option.description)
                            .setRequired(option.required)
                    );

                    break;

                case "mentionable":

                    builder.addMentionableOption(o =>
                        o
                            .setName(option.name)
                            .setDescription(option.description)
                            .setRequired(option.required)
                    );

                    break;

                case "attachment":

                    builder.addAttachmentOption(o =>
                        o
                            .setName(option.name)
                            .setDescription(option.description)
                            .setRequired(option.required)
                    );

                    break;

            }

        }

    }

    commands.push(builder);

}

/* ==========================
            REST
========================== */

const rest = new REST({

    version: "10"

}).setToken(TOKEN);

/* ==========================
            READY
========================== */

client.once(Events.ClientReady, async () => {

    console.clear();

    console.log("===================================");

    console.log("🛡️ Iniciando Gaburon...");

    try {

        await rest.put(

            Routes.applicationCommands(CLIENT_ID),

            {

                body: commands

            }

        );

        console.log(`✅ Conectado como ${client.user.tag}`);

        console.log(`📦 ${commands.length} comandos registrados.`);

        console.log("===================================");

    }

    catch (err) {

        console.error("❌ Error registrando comandos:");

        console.error(err);

    }

});

/* ==========================
        INTERACCIONES
========================== */

client.on(

    Events.InteractionCreate,

    async interaction => {

        try {

            await executeLogic(

                interaction,

                client

            );

        }

        catch (err) {

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

);

/* ==========================
            LOGIN
========================== */

client.login(TOKEN).catch(err => {

    console.error("❌ Error al iniciar sesión:");

    console.error(err);

});
