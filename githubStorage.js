/// GITHUB STORAGE ///

import fs from "fs";

const CONFIG_PATH = "./config.json";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || "michuucrac-max";
const GITHUB_REPO = process.env.GITHUB_REPO || "Gaburon";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

const GITHUB_API = "https://api.github.com";

const FILE_PATH = "config.json";

let dirty = false;
let syncing = false;


/* ==========================
        HEADERS
========================== */

function getHeaders() {

    return {

        "Accept":
            "application/vnd.github+json",

        "Authorization":
            `Bearer ${GITHUB_TOKEN}`,

        "X-GitHub-Api-Version":
            "2022-11-28",

        "Content-Type":
            "application/json"

    };

}


/* ==========================
       URL DEL ARCHIVO
========================== */

function getFileUrl() {

    return (
        `${GITHUB_API}/repos/` +
        `${GITHUB_OWNER}/` +
        `${GITHUB_REPO}/contents/` +
        `${FILE_PATH}`
    );

}


/* ==========================
       DESCARGAR CONFIG
========================== */

export async function loadConfigFromGitHub() {

    if (!GITHUB_TOKEN) {

        console.warn(
            "⚠️ GITHUB_TOKEN no configurado."
        );

        return null;

    }

    try {

        const response = await fetch(

            `${getFileUrl()}?ref=${encodeURIComponent(
                GITHUB_BRANCH
            )}`,

            {

                method: "GET",

                headers:
                    getHeaders()

            }

        );


        if (response.status === 404) {

            console.log(
                "☁️ config.json todavía no existe en GitHub."
            );

            return null;

        }


        if (!response.ok) {

            const text =
                await response.text();

            throw new Error(

                `GitHub GET ${response.status}: ${text}`

            );

        }


        const data =
            await response.json();


        const content =
            Buffer.from(

                data.content.replace(/\n/g, ""),

                "base64"

            ).toString("utf8");


        console.log(
            "☁️ config.json descargado desde GitHub."
        );


        return {

            content,

            sha:
                data.sha

        };


    } catch (error) {

        console.error(
            "❌ Error leyendo config.json desde GitHub:",
            error
        );

        return null;

    }

}


/* ==========================
       GUARDAR CAMBIOS
========================== */

export function markConfigDirty() {

    dirty = true;

}


/* ==========================
        ¿HAY CAMBIOS?
========================== */

export function isConfigDirty() {

    return dirty;

}


/* ==========================
       SUBIR CONFIG
========================== */

export async function flushConfigToGitHub() {

    if (!GITHUB_TOKEN)
        return false;


    if (!dirty)
        return false;


    if (syncing)
        return false;


    syncing = true;


    try {

        if (!fs.existsSync(CONFIG_PATH)) {

            console.warn(
                "⚠️ No existe config.json."
            );

            return false;

        }


        const content =
            fs.readFileSync(

                CONFIG_PATH,

                "utf8"

            );


        /*
         * Obtener SHA actual.
         */

        const remote =
            await loadConfigFromGitHub();


        const body = {

            message:
                "💾 Gaburon: actualización de configuración",

            content:
                Buffer.from(
                    content,
                    "utf8"
                ).toString("base64"),

            branch:
                GITHUB_BRANCH

        };


        /*
         * Si ya existe el archivo,
         * GitHub necesita su SHA.
         */

        if (remote?.sha) {

            body.sha =
                remote.sha;

        }


        const response =
            await fetch(

                getFileUrl(),

                {

                    method: "PUT",

                    headers:
                        getHeaders(),

                    body:
                        JSON.stringify(body)

                }

            );


        if (!response.ok) {

            const text =
                await response.text();

            throw new Error(

                `GitHub PUT ${response.status}: ${text}`

            );

        }


        dirty = false;


        console.log(
            "☁️✅ config.json guardado en GitHub."
        );


        return true;


    } catch (error) {

        console.error(
            "❌ Error guardando config.json en GitHub:",
            error
        );

        return false;


    } finally {

        syncing = false;

    }

}


/* ==========================
       SUBIDA FORZADA
========================== */

export function forceConfigSave() {

    dirty = true;

}
