// SPDX-FileCopyrightText: © 2025 Kevin Lu, Luna Brand
// SPDX-Licence-Identifier: AGPL-3.0-or-later

import * as fs from "fs";
import got from "got";
import { ElementType, parseDocument } from "htmlparser2";
import { Element, NodeWithChildren } from "domhandler";
import { selectAll, selectOne } from "css-select";
import { resourceLimits } from "worker_threads";

const fetch = got.extend({
    timeout: 10000,
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

async function hasChanged(newVectorJSON: string) {
    try {
        const oldVectorJSON = await fs.promises.readFile("current.vector.json", { encoding: "utf-8" });
        return oldVectorJSON !== newVectorJSON;
    } catch (e) {
        console.warn(e);
        return true;
    }
}

(async () => {
    const enToKonamiId = new Map<string, number>();
    const cards = JSON.parse(await fs.promises.readFile(process.argv[2], { encoding: "utf-8" }));
    for (const card of cards) {
        if (card.konami_id) {
            if (card.name.en) {
                enToKonamiId.set(card.name.en, card.konami_id);
            }
        }
    }

    function getKonamiId(name: string) {
        const kid = enToKonamiId.get(name);
        if (kid) {
            console.log(`[${name}] Konami ID [${kid}]`);
            return kid;
        } else {
            console.log(`[${name}] Konami ID not found`);
            return name;
        }
    }

    const response = await fetch("https://www.yugioh-card.com/en/genesys/");
    await fs.promises.writeFile("genesys.html", response.rawBody);
    const html = parseDocument(response.body);
    const table = selectOne<NodeWithChildren, Element>("#tablepress-genesys > tbody", html);
    if (!table) {
        throw new Error("Main table not found");
    }
    const rows = selectAll("tr", table).map(tr => selectAll("td", tr).map(parseCell));
    const rawJSON = JSON.stringify(Object.fromEntries(rows), null, 2) + "\n";
    const regulation = Object.fromEntries(rows.map(([name, points]) => [getKonamiId(name), Number(points)]));
    const date = new Date().toISOString().split("T")[0];
    const result = { date, regulation };
    const vectorJSON = JSON.stringify(result, null, 2) + "\n";
    if (await hasChanged(vectorJSON)) {
        await fs.promises.writeFile(`${date}.raw.json`, rawJSON);
        const newFile = `${date}.vector.json`;
        console.log(`Writing out ${newFile} as current.vector.json`);
        await fs.promises.writeFile(newFile, vectorJSON);
        await fs.promises.unlink("current.vector.json").catch(console.error);
        await fs.promises.symlink(newFile, "current.vector.json");
    } else {
        console.log("No changes.");
    }
})();
