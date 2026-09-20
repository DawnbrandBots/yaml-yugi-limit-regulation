// SPDX-FileCopyrightText: © 2026 Kevin Lu
// SPDX-Licence-Identifier: AGPL-3.0-or-later

import * as fs from "fs";
import got from "got";
import { ElementType, parseDocument } from "htmlparser2";
import type { Element, NodeWithChildren } from "domhandler";
import { selectAll, selectOne } from "css-select";

const fetch = got.extend({
    prefixUrl: "https://www.yugioh-card.com/en/genesys/",
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
        throw new Error("td is not text");
    }
    return td.children[0].data;
}

const enToKonamiId = new Map<string, number>();
const cards = JSON.parse(await fs.promises.readFile(process.argv[2], { encoding: "utf-8" }));
for (const card of cards) {
    if (card.konami_id) {
        if (card.name.en) {
            enToKonamiId.set(card.name.en, card.konami_id);
        }
    }
}

function getKonamiID(name: string) {
    const kid = enToKonamiId.get(name);
    if (!kid) {
        console.warn(`[${name}] Konami ID not found`);
        // Official typos!
        switch (name) {
            case "Exstellarknight Constellar Ptolemy O7":
                return 22203;
            case "K9-�� Lupis":
                return 21379;
            default:
                console.warn(`[${name}] Konami ID not found with no fallback`);
                return name;
        }
    }
    return kid;
}

const date = new Date().toISOString().split("T")[0];
const response = await fetch("");
await fs.promises.writeFile(`${date}.html`, response.rawBody);
const html = parseDocument(response.body);
const rows = selectAll<NodeWithChildren, Element>("#tablepress-genesys > tbody > tr", html);
const entries = rows.map(row => {
    const cell1 = selectOne<NodeWithChildren, Element>("td.column-1", row);
    if (!cell1) {
        throw new Error("tr is missing a td.column-1 child");
    }
    const name = parseCell(cell1);
    const cell2 = selectOne<NodeWithChildren, Element>("td.column-2", row);
    if (!cell2) {
        throw new Error("tr is missing a td.column-1 child");
    }
    const points = Number(parseCell(cell2));
    const id = getKonamiID(name);
    return [id, points] as const;
});
const file = `${date}.vector.json`;
const regulation = Object.fromEntries(entries);
const result = { date, regulation };
await fs.promises.writeFile(file, JSON.stringify(result, null, 2) + "\n");
await fs.promises.unlink("current.vector.json").catch(console.error);
await fs.promises.symlink(file, "current.vector.json");
