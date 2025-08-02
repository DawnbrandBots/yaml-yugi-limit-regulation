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
interface CardData {
    en: {
        effective_dates: {
            effective_date_name: string;
            card_lists: [
                { card_list_name: "Forbidden"; cards: { card_name: string; japanese_card_name: string }[] },
                { card_list_name: "Limited"; cards: { card_name: string; japanese_card_name: string }[] },
                { card_list_name: "Semi-Limited"; cards: { card_name: string; japanese_card_name: string }[] },
                { card_list_name: "Forbidden (AE)"; cards: { card_name: string }[] },
                { card_list_name: "Limited (AE)"; cards: { card_name: string }[] },
                { card_list_name: "Semi-Limited (AE)"; cards: { card_name: string }[] }
            ];
        }[];
    };
}

(async () => {
    // Also https://www.yugioh-card.com/asia//play/forbidden-and-limited-card-list-ae/
    const response = await fetch("https://www.yugioh-card.com/asia//play/forbidden-and-limited-list/");
    const rawPromise = fs.promises.writeFile("raw.html", response.body);
    const cardDataJSON = response.body.split("const cardData = ")[1].split(";\n")[0];
    const jsonPromise = fs.promises.writeFile("cardData.json", cardDataJSON);
    const cardData: CardData = JSON.parse(cardDataJSON);
    for (const effectiveList of cardData.en.effective_dates) {
        const regulationDate = new Date(`01-${effectiveList.effective_date_name}`);
        const date = regulationDate.toISOString().split("T")[0];
        console.log(date);
        const lists = Object.fromEntries(effectiveList.card_lists.map(list => [list.card_list_name, list.cards]));
        if ("Forbidden" in lists || "Limited" in lists || "Semi-Limited" in lists) {
            const regulation: Record<string, 0 | 1 | 2> = {};
            for (const { card_name } of lists["Forbidden"] ?? []) {
                regulation[card_name] = 0;
            }
            for (const { card_name } of lists["Limited"] ?? []) {
                regulation[card_name] = 1;
            }
            for (const { card_name } of lists["Semi-Limited"] ?? []) {
                regulation[card_name] = 2;
            }
            const result = { date, regulation };
            fs.promises.writeFile(`${date}.name.json`, `${JSON.stringify(result, null, 2)}\n`);
        }
        if ("Forbidden (AE)" in lists || "Limited (AE)" in lists || "Semi-Limited (AE)" in lists) {
            const regulation: Record<string, 0 | 1 | 2> = {};
            for (const { card_name } of lists["Forbidden (AE)"] ?? []) {
                regulation[card_name] = 0;
            }
            for (const { card_name } of lists["Limited (AE)"] ?? []) {
                regulation[card_name] = 1;
            }
            for (const { card_name } of lists["Semi-Limited (AE)"] ?? []) {
                regulation[card_name] = 2;
            }
            const result = { date, regulation };
            fs.promises.writeFile(`${date}.ae.name.json`, `${JSON.stringify(result, null, 2)}\n`);
        }
    }
    await Promise.all([rawPromise, jsonPromise]);
})();
