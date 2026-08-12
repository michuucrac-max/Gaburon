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
  Partials
} from "discord.js";

import {
    executeLogic,
    ensureCounterChannel,
    config,
    sendWelcome,
    sendFarewell,
    handleBoost,
    handleAutoModMessage
} from "./logic.js";

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
app.get("/", (_, res) => res.send("Gaburon operativo."));
app.get("/ping", (_, res) => res.send("OK"));
app.listen(PORT, () => console.log(`🌐 Servidor iniciado (${PORT})`));

setInterval(() => { http.get(`http://localhost:${PORT}/ping`).on("error", () => {}); }, 1000 * 60 * 5);

/* ==========================
        CARGAR CMD.JSON
========================== */
const cmdData = JSON.parse(fs.readFileSync("./cmd.json", "utf8"));
const commands = [];
for (const cmd of cmdData) {
  const builder = new SlashCommandBuilder().setName(cmd.name).setDescription(cmd.description);
  if (cmd.options) {

/* =========================================================
   🧩 OPCIONES Y SUBCOMANDOS
   ========================================================= */

if (cmd.subcommands) {

    for (const subcommand of cmd.subcommands) {

        builder.addSubcommand(sub => {

            sub
                .setName(subcommand.name)
                .setDescription(subcommand.description);

            if (subcommand.options) {

                for (const option of subcommand.options) {

                    switch (option.type) {

                        case "string":

                            sub.addStringOption(o =>
                                o
                                    .setName(option.name)
                                    .setDescription(option.description)
                                    .setRequired(option.required ?? false)
                            );

                            break;

                        case "user":

                            sub.addUserOption(o =>
                                o
                                    .setName(option.name)
                                    .setDescription(option.description)
                                    .setRequired(option.required ?? false)
                            );

                            break;

                        case "channel":

                            sub.addChannelOption(o =>
                                o
                                    .setName(option.name)
                                    .setDescription(option.description)
                                    .setRequired(option.required ?? false)
                            );

                            break;

                        case "boolean":

                            sub.addBooleanOption(o =>
                                o
                                    .setName(option.name)
                                    .setDescription(option.description)
                                    .setRequired(option.required ?? false)
                            );

                            break;

                        case "integer":

                            sub.addIntegerOption(o =>
                                o
                                    .setName(option.name)
                                    .setDescription(option.description)
                                    .setRequired(option.required ?? false)
                            );

                            break;

                        case "number":

                            sub.addNumberOption(o =>
                                o
                                    .setName(option.name)
                                    .setDescription(option.description)
                                    .setRequired(option.required ?? false)
                            );

                            break;

                        case "role":

                            sub.addRoleOption(o =>
                                o
                                    .setName(option.name)
                                    .setDescription(option.description)
                                    .setRequired(option.required ?? false)
                            );

                            break;

                        case "mentionable":

                            sub.addMentionableOption(o =>
                                o
                                    .setName(option.name)
                                    .setDescription(option.description)
                                    .setRequired(option.required ?? false)
                            );

                            break;

                        case "attachment":

                            sub.addAttachmentOption(o =>
                                o
                                    .setName(option.name)
                                    .setDescription(option.description)
                                    .setRequired(option.required ?? false)
                            );

                            break;

                    }

                }

            }

            return sub;

        });

    }

} else if (cmd.options) {

    for (const option of cmd.options) {

        switch (option.type) {

            case "string":

                builder.addStringOption(o =>
                    o
                        .setName(option.name)
                        .setDescription(option.description)
                        .setRequired(option.required ?? false)
                );

                break;

            case "user":

                builder.addUserOption(o =>
                    o
                        .setName(option.name)
                        .setDescription(option.description)
                        .setRequired(option.required ?? false)
                );

                break;

            case "channel":

                builder.addChannelOption(o =>
                    o
                        .setName(option.name)
                        .setDescription(option.description)
                        .setRequired(option.required ?? false)
                );

                break;

            case "boolean":

                builder.addBooleanOption(o =>
                    o
                        .setName(option.name)
                        .setDescription(option.description)
                        .setRequired(option.required ?? false)
                );

                break;

            case "integer":

                builder.addIntegerOption(o =>
                    o
                        .setName(option.name)
                        .setDescription(option.description)
                        .setRequired(option.required ?? false)
                );

                break;

            case "number":

                builder.addNumberOption(o =>
                    o
                        .setName(option.name)
                        .setDescription(option.description)
                        .setRequired(option.required ?? false)
                );

                break;

            case "role":

                builder.addRoleOption(o =>
                    o
                        .setName(option.name)
                        .setDescription(option.description)
                        .setRequired(option.required ?? false)
                );

                break;

            case "mentionable":

                builder.addMentionableOption(o =>
                    o
                        .setName(option.name)
                        .setDescription(option.description)
                        .setRequired(option.required ?? false)
                );

                break;

            case "attachment":

                builder.addAttachmentOption(o =>
                    o
                        .setName(option.name)
                        .setDescription(option.description)
                        .setRequired(option.required ?? false)
                );

                break;

        }

    }

}
            
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

    // Actualizar contadores al iniciar en todas las guilds
    for (const guild of client.guilds.cache.values()) {
      try {
        await updateCounters(guild);
      } catch (err) {
        console.error(`Error actualizando contadores en guild ${guild.id}:`, err);
      }
    }
  } catch (err) {
    console.error("❌ Error registrando comandos:", err);
  }
});

/* ==========================
        INTERACCIONES
========================== */
client.on(Events.InteractionCreate, async interaction => {
  try {
    await executeLogic(interaction, client);
  } catch (err) {
    console.error("❌ Error en una interacción:", err);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ Ocurrió un error interno al ejecutar esta interacción.", ephemeral: true });
    }
  }
});

/* ==========================
   EVENTOS AUTOMÁTICOS
========================== */
client.on("guildMemberAdd", member => {
  updateCounters(member.guild).catch(err => console.error("guildMemberAdd updateCounters:", err));
});
client.on("guildMemberRemove", member => {
  updateCounters(member.guild).catch(err => console.error("guildMemberRemove updateCounters:", err));
});

async function updateCounters(guild) {
  try {
    const members = await guild.members.fetch();
    const humans = members.filter(m => !m.user.bot).size;
    const bots = members.filter(m => m.user.bot).size;

    await ensureCounterChannel(guild, "humans", "👤 Humanos", humans);
    await ensureCounterChannel(guild, "bots", "🤖 Bots", bots);
  } catch (err) {
    console.error("updateCounters error:", err);
  }
}

/* =========================================================
   🛡️ AUTOMOD — MENSAJES
========================================================= */

client.on(Events.MessageCreate, async message => {

    try {

        await handleAutoModMessage(message);

    } catch (error) {

        console.error(
            "❌ Error procesando AutoMod:",
            error
        );

    }

});
            
/* ==========================
   EVENTOS DE MIEMBROS
========================== */

// Asegúrate de que los listeners estén registrados ANTES de client.login(token)

client.on(Events.GuildMemberAdd, async member => {
  try {
    console.log(`[EVENT] guildMemberAdd fired guild=${member.guild?.id} user=${member.id}`);

    // Asegurar miembro completo si viene parcial
    if (member.partial) {
      try { member = await member.fetch(); } catch (e) { console.warn("[EVENT] fetch member failed:", e); }
    }

    // Debug: mostrar configuración actual para la guild
    console.log("[EVENT] guild config:", config.channels?.[member.guild.id] ?? {});

    // Actualizar contadores y enviar bienvenida
    await updateCounters(member.guild).catch(err => console.error("guildMemberAdd updateCounters:", err));
    await sendWelcome(member).catch(err => console.error("sendWelcome error:", err));
  } catch (err) {
    console.error("guildMemberAdd handler error:", err);
  }
});

client.on(Events.GuildMemberRemove, async member => {
  try {
    console.log(`[EVENT] guildMemberRemove fired guild=${member.guild?.id} user=${member.id}`);

    if (member.partial) {
      try { member = await member.fetch(); } catch (e) { /* ignore */ }
    }

    await updateCounters(member.guild).catch(err => console.error("guildMemberRemove updateCounters:", err));
    await sendFarewell(member).catch(err => console.error("sendFarewell error:", err));
  } catch (err) {
    console.error("guildMemberRemove handler error:", err);
  }
});

client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  try {
    console.log(`[EVENT] guildMemberUpdate fired guild=${newMember.guild?.id} user=${newMember.id}`);

    // Asegurar objetos completos
    if (oldMember?.partial) {
      try { oldMember = await oldMember.fetch(); } catch (e) { /* ignore */ }
    }
    if (newMember?.partial) {
      try { newMember = await newMember.fetch(); } catch (e) { /* ignore */ }
    }

    // Si oldMember no tiene premiumSince, intentar fetch del miembro en la guild
    if (!oldMember?.premiumSince) {
      const fetched = await newMember.guild.members.fetch(newMember.id).catch(() => null);
      if (fetched) oldMember = fetched;
    }

    await handleBoost(oldMember, newMember).catch(err => console.error("handleBoost error:", err));
  } catch (err) {
    console.error("guildMemberUpdate handler error:", err);
  }
});

/* ==========================
            LOGIN
========================== */
client.login(TOKEN)
  .then(() => console.log("🔑 Login realizado correctamente."))
  .catch(err => console.error("❌ Error iniciando sesión:", err));
