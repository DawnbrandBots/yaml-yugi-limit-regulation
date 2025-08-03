// SPDX-FileCopyrightText: © 2025 Kevin Lu
// SPDX-Licence-Identifier: AGPL-3.0-or-later

import * as fs from "fs";
import got from "got";

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

// There are other fields and array elements but they are not needed for our purposes
interface Card {
    card_name: string;
}

interface CardData {
    en: {
        effective_dates: {
            effective_date_name: Date; // via reviver, else it is a string of the form MMM-YY, e.g. Jan-25
            card_lists: [
                { card_list_name: "Forbidden (AE)"; cards: Card[] },
                { card_list_name: "Limited (AE)"; cards: Card[] },
                { card_list_name: "Semi-Limited (AE)"; cards: Card[] }
            ];
        }[];
    };
}

interface RegulationMap {
    "Forbidden (AE)"?: Card[];
    "Limited (AE)"?: Card[];
    "Semi-Limited (AE)"?: Card[];
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

    // Also https://www.yugioh-card.com/asia//play/forbidden-and-limited-list/, but it's not accurate for Japan
    const response = await fetch("https://www.yugioh-card.com/asia//play/forbidden-and-limited-card-list-ae/");
    await fs.promises.writeFile("raw.html", response.body);
    const cardDataJSON = response.body.split("const cardData = ")[1].split(";\n")[0];
    await fs.promises.writeFile("cardData.json", cardDataJSON);

    // effective_date_name is of the form MMM-YY, e.g. Jan-25
    const cardData: CardData = JSON.parse(cardDataJSON, (key, value) =>
        key === "effective_date_name" ? new Date(`01-${value}`) : value
    );
    // Unlike other websites, this is not in order. As JavaScript lacks a native heap data structure,
    // instead of adding a dependency, first sort the short list of dates in descending order in-place.
    const effectiveLists = cardData.en.effective_dates.sort(
        (a, b) => b.effective_date_name.getTime() - a.effective_date_name.getTime()
    );
    const outputFilesByDate = [];
    for (const effectiveList of effectiveLists) {
        const date = effectiveList.effective_date_name.toISOString().split("T")[0];
        console.log(date);
        const sections: RegulationMap = Object.fromEntries(
            effectiveList.card_lists.map(list => [list.card_list_name, list.cards])
        );
        if ("Forbidden (AE)" in sections || "Limited (AE)" in sections || "Semi-Limited (AE)" in sections) {
            const regulation: Record<string, 0 | 1 | 2> = {};
            for (const { card_name } of sections["Forbidden (AE)"] ?? []) {
                regulation[getKonamiId(card_name)] = 0;
            }
            for (const { card_name } of sections["Limited (AE)"] ?? []) {
                regulation[getKonamiId(card_name)] = 1;
            }
            for (const { card_name } of sections["Semi-Limited (AE)"] ?? []) {
                regulation[getKonamiId(card_name)] = 2;
            }
            const result = { date, regulation };
            const file = `${date}.vector.json`;
            outputFilesByDate.push({ date: effectiveList.effective_date_name, file });
            await fs.promises.writeFile(file, `${JSON.stringify(result, null, 2)}\n`);
        } else {
            console.log(`${date}: no AE list`);
        }
    }

    // Current Forbidden & Limited List can only be one of the two most recent (most recent may yet to be effective)
    const currentFile = outputFilesByDate[0].date < new Date() ? outputFilesByDate[0].file : outputFilesByDate[1].file;
    const recentFile = outputFilesByDate[0].file;
    console.log(`Currently effective: ${currentFile}. Most recent: ${recentFile}`);
    await fs.promises.unlink("current.vector.json").catch(console.error);
    await fs.promises.symlink(currentFile, "current.vector.json");
    await fs.promises.unlink("upcoming.vector.json").catch(console.error);
    if (recentFile !== currentFile) {
        await fs.promises.symlink(recentFile, "upcoming.vector.json");
    }
})();
