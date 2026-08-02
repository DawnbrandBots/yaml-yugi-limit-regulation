// SPDX-FileCopyrightText: © 2025–2026 Kevin Lu
// SPDX-Licence-Identifier: AGPL-3.0-or-later

import * as fs from "fs";
import got from "got";
import { ElementType, parseDocument } from "htmlparser2";
import type { Element, NodeWithChildren } from "domhandler";
import { selectAll, selectOne } from "css-select";

// YAML Yugi uses fullwidth versions of ASCII characters, while the limit regulation website uses halfwidth.
// The website uses the halfwidth middle dot rather than the fullwidth middle dot for Glow-Up Bulb.
function toFullWidth(halfwidth: string): string {
    return halfwidth
        .replaceAll("･", "・")
        .replace(/[!-~]/g, c => String.fromCharCode(c.charCodeAt(0) + 0xfee0));
}

// Keeps only base text. Based on load.ts:parseAndExpandRuby
function extractBaseTextFromRuby(html: string): string {
    let result = "";
    const doc = parseDocument(html);
    for (const element of doc.children) {
        if (element.type === "text") {
            result += element.data;
        } else if (element.type === "tag" && element.name === "ruby") {
            if (element.children.length === 2) {
                const [rb, rt] = element.children;
                if (
                    rb.type === "text" &&
                    rt.type === "tag" &&
                    rt.name === "rt" &&
                    rt.children.length === 1 &&
                    rt.children[0].type === "text"
                ) {
                    result += rb.data;
                } else {
                    console.warn(`${html} | Unexpected <ruby> children properties`);
                }
            } else {
                console.warn(`${html} | Unexpected number of <ruby> children: ${element.children.length}`);
            }
        } else {
            console.warn(`${html} | Unexpected element type ${element.type}`);
        }
    }
    return result;
}

const fetch = got.extend({
    prefixUrl: "https://www.yugioh-card.com/japan/howto/genesys/",
    timeout: { request: 10000 },
    hooks: {
        beforeRequest: [
            request => {
                console.log(`Fetching ${request.url}`);
            }
        ]
    }
});

function parseCell(td: Element) {
    if (!td.children.length) {
        throw new Error("td has no children");
    }
    if (td.children[0].type !== ElementType.Text) {
        throw new Error("tdis not text");
    }
    return td.children[0].data;
}

const jaBaseToKonamiID = new Map<string, number>();
const cards = JSON.parse(await fs.promises.readFile(process.argv[2], { encoding: "utf-8" }));
for (const card of cards) {
    if (card.konami_id) {
        if (card.name.ja) {
            jaBaseToKonamiID.set(
                card.name.ja.includes("<ruby>") ? extractBaseTextFromRuby(card.name.ja) : card.name.ja,
                card.konami_id
            );
        }
    }
}

function getKonamiID(name: string) {
    const kid = jaBaseToKonamiID.get(toFullWidth(name));
    if (!kid) {
        console.warn(`[${name}] Konami ID not found`);
        return name;
    }
    return kid;
}

const indexResponse = await fetch("");
const html = parseDocument(indexResponse.body);
const links = selectAll<NodeWithChildren, Element>("#point a", html);
const files = [];
for (const eventAnchor of links) {
    const yyyymm = parseInt(eventAnchor.attribs.href.slice(6));
    console.log(yyyymm);
    const pageResponse = await fetch(eventAnchor.attribs.href);
    await fs.promises.writeFile(`${yyyymm}.html`, pageResponse.rawBody);
    const pageHtml = parseDocument(pageResponse.body);
    const rows = selectAll<NodeWithChildren, Element>("table.genesyspoint > tbody > tr", pageHtml);
    const entries = rows.map(row => {
         const cell = selectOne<NodeWithChildren, Element>("td:nth-child(2)", row);
        if (!cell) {
            throw new Error("tr is missing a second td");
        }
        const name = parseCell(cell);
        const points = Number(row.attribs["data-point"]);
        const id = getKonamiID(name);
        return [id, points] as const;
    });
    const date = new Date(Math.floor(yyyymm / 100), (yyyymm % 100) - 1, 1);
    const dateString = date.toISOString().split("T")[0];
    const file = `${dateString}.vector.json`;
    const regulation = Object.fromEntries(entries);
    const result = { date: dateString, regulation };
    await fs.promises.writeFile(file, JSON.stringify(result, null, 2) + "\n");
    files.push({ date, file });
}
// Current Forbidden & Limited List can only be one of the two most recent (most recent may yet to be effective)
const currentFile = files[0].date < new Date() ? files[0] : files[1];
console.log(`Currently effective: ${currentFile.date}. Most recent: ${files[0].date}`);
await fs.promises.unlink("current.vector.json").catch(console.error);
await fs.promises.symlink(currentFile.file, "current.vector.json");
await fs.promises.unlink("upcoming.vector.json").catch(console.error);
if (files[0].file !== currentFile.file) {
    await fs.promises.symlink(files[0].file, "upcoming.vector.json");
}
