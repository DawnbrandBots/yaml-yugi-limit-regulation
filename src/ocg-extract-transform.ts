// SPDX-FileCopyrightText: © 2023–2024 Kevin Lu
// SPDX-Licence-Identifier: AGPL-3.0-or-later

import * as fs from "fs";
import got from "got";
import { parseDocument } from "htmlparser2";
import type { Element } from "domhandler";
import { selectAll } from "css-select";
import { Option, program } from "commander";

// YAML Yugi uses fullwidth versions of ASCII characters, while the CSV uses halfwidth.
// YAML Yugi: The Tyrant Neptune uses fullwidth spaces, while everything else uses halfwidth spaces.
// CSV: A few cases like Number 95 and Glow-Up Bulb use the halfwidth middle dot rather than the fullwidth middle dot.
function toFullWidth(halfwidth: string): string {
    return halfwidth
        .replaceAll("･", "・")
        //.replaceAll("\u0020", "\u3000")
        .replace(/[!-~]/g, c => String.fromCharCode(c.charCodeAt(0) + 0xFEE0));
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

const LIMITS: Record<string, number> = {
    "禁止": 0,
    "制限": 1,
    "準制限": 2,
    "解除": 3
};

const INDEX_PHP: Record<string, string> = {
    jp: "forbidden_cardlist",
    ae: "forbidden_cardlist_aen"
};

const CSV_DIR: Record<string, string> = {
    jp: "forbidden_card_lists",
    ae: "forbidden_card_lists_aen"
};

const fetch = got.extend({ timeout: 10000, hooks: {
	beforeRequest: [
		request => {
			console.log(`Fetching ${request.url}`);
		}
	],
} });

program
    .argument("<cards.json>", "Path to YAML Yugi cards.json")
    .option("--recent", "Only download and convert the most recent two lists")
    .addOption(new Option("--region [code]", "Target OCG regional list")
        .choices(["jp", "ae"])
        .default("jp"))
    .parse();

(async () => {
    const { recent: recentTwoOnly, region } = program.opts<{ recent: boolean, region: "jp" | "ae" }>();
    const jaBaseToKonamiID = new Map<string, number>();
    const enToKonamiId = new Map<string, number>();
    const cards = JSON.parse(await fs.promises.readFile(program.args[0], { encoding: "utf-8" }));
    for (const card of cards) {
        if (card.konami_id) {
            if (card.name.ja) {
                jaBaseToKonamiID.set(
                    card.name.ja.includes("<ruby>") ? extractBaseTextFromRuby(card.name.ja) : card.name.ja,
                    card.konami_id
                );
            }
            if (card.name.en) {
                enToKonamiId.set(card.name.en, card.konami_id);
            }
        }
    }
    const konamiId = {
        jp: (name: string) => {
            const fullwidth = toFullWidth(name);
            let kid = jaBaseToKonamiID.get(fullwidth);
            if (!kid) {
                // Workaround for The Tyrant Neptune
                kid = jaBaseToKonamiID.get(fullwidth.replaceAll("\u0020", "\u3000"));
            }
            return kid;
        },
        // Workaround for Amazoness Archer (Updated from: Amazon Archer)
        ae: (name: string) => enToKonamiId.get(name.split(" (")[0])
    };

	// const jpIndex = await fetch("https://www.yugioh-card.com/japan/event/rankingduel/limitregulation/");
    // const jpHtml = parseDocument(jpIndex.body);
    // const jpLinks = selectAll("a.event", jpHtml as unknown as Element);
    // const jpDates = jpLinks.map(element => parseInt(element.attribs.href.slice(6)));

    const hkIndexPhp = INDEX_PHP[region];
    const hkCsvDir = CSV_DIR[region];
    const hkIndex = await fetch(`https://www.yugioh-card.com/hk/event/rules_guides/${hkIndexPhp}.php`);
    const hkHtml = parseDocument(hkIndex.body);
    const hkLinks = selectAll("a.to_event", hkHtml as unknown as Element);
    let hkDates = hkLinks.map(element => parseInt(element.attribs.href.slice(6)));
    if (recentTwoOnly) {
        hkDates = hkDates.slice(0, 2);
    }
    const files = await Promise.all(hkDates.map(async yyyymm => {
        const date = new Date(Math.floor(yyyymm / 100), yyyymm % 100 - 1, 1);
        const dateString = date.toISOString().split("T")[0];
        const file = `${dateString}.vector.json`;
        if (!fs.existsSync(`${yyyymm}.csv`)) {
            const response = await fetch(`https://www.yugioh-card.com/hk/data/${hkCsvDir}/${yyyymm}.csv`);
            // CSVs 202104 and prior are encoded in Shift_JIS rather than Unicode
            await fs.promises.writeFile(`${yyyymm}.csv`, response.rawBody);
            const regulation: Record<string, number> = {};
            const lines = response.body.split("\n");
            for (const line of lines) {
                if (line[0] === "$" || line[0] === "," || !line.trim().length) {
                    continue;
                }
                const [limitLabel, , name] = line.split(",");
                const limit = LIMITS[limitLabel];
                if (limit < 3) {
                    const kid = konamiId[region](name);
                    if (kid) {
                        regulation[kid] = limit;
                        console.log(`${yyyymm}: [${name}] limit [${limit}] Konami ID [${kid}]`);
                    } else {
                        console.log(`${yyyymm}: [${name}] limit [${limit}] Konami ID not found`);
                    }
                } else {
                    console.log(`${yyyymm}: Skip [${limitLabel}] [${name}]`);
                }
            }
            const result = { date: dateString, regulation };
            await fs.promises.writeFile(file, JSON.stringify(result, null, 2) + "\n");
        }
        return { date, file };
    }));
    if (recentTwoOnly) {
        // Current Forbidden & Limited List can only be one of the two most recent (most recent may yet to be effective)
        const currentFile = files[0].date < new Date() ? files[0] : files[1];
        console.log(`Currently effective: ${currentFile.date}. Most recent: ${files[0].date}`);
        await fs.promises.unlink("current.vector.json").catch(console.error);
        await fs.promises.symlink(currentFile.file, "current.vector.json");
        await fs.promises.unlink("upcoming.vector.json").catch(console.error);
        if (files[0].file !== currentFile.file) {
            await fs.promises.symlink(files[0].file, "upcoming.vector.json");
        }
    }
})();
