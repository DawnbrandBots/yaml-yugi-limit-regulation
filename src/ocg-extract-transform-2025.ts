// SPDX-FileCopyrightText: © 2025 Kevin Lu
// SPDX-Licence-Identifier: AGPL-3.0-or-later

import * as fs from "fs";
import got from "got";
import { parseDocument } from "htmlparser2";

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

interface JPCard extends Card {
	japanese_card_name: string;
}

interface CardData {
	en: {
		effective_dates: {
			effective_date_name: string;
			card_lists: [
				{ card_list_name: "Forbidden"; cards: JPCard[] },
				{ card_list_name: "Limited"; cards: JPCard[] },
				{ card_list_name: "Semi-Limited"; cards: JPCard[] },
				{ card_list_name: "Forbidden (AE)"; cards: Card[] },
				{ card_list_name: "Limited (AE)"; cards: Card[] },
				{ card_list_name: "Semi-Limited (AE)"; cards: Card[] }
			];
		}[];
	};
}

interface RegulationMap {
	Forbidden?: JPCard[];
	Limited?: JPCard[];
	"Semi-Limited"?: JPCard[];
	"Forbidden (AE)"?: Card[];
	"Limited (AE)"?: Card[];
	"Semi-Limited (AE)"?: Card[];
}

(async () => {
	const [, , yamlYugiCardsJsonFile, jpOutput, aeOutput] = process.argv;
	const jaBaseToKonamiID = new Map<string, number>();
	const enUppercaseToKonamiID = new Map<string, number>();
	const cards = JSON.parse(await fs.promises.readFile(yamlYugiCardsJsonFile, { encoding: "utf-8" }));
	for (const card of cards) {
		if (card.konami_id) {
			if (card.name.ja) {
				jaBaseToKonamiID.set(
					card.name.ja.includes("<ruby>") ? extractBaseTextFromRuby(card.name.ja) : card.name.ja,
					card.konami_id
				);
			}
			if (card.name.en) {
				enUppercaseToKonamiID.set(card.name.en.toUpperCase(), card.konami_id);
			}
		}
	}

	function getKonamiId(enName: string, jaName?: string) {
		if (jaName) {
			return (
				enUppercaseToKonamiID.get(enName) ??
				jaBaseToKonamiID.get(jaName) ??
				(console.log(`Konami ID not found: [${jaName}]`), jaName)
			);
		}
		return (
			enUppercaseToKonamiID.get(enName.toUpperCase()) ?? (console.log(`Konami ID not found: [${enName}]`), enName)
		);
	}

    // Also https://www.yugioh-card.com/asia//play/forbidden-and-limited-list/, but it's not accurate for Japan
	const response = await fetch("https://www.yugioh-card.com/asia//play/forbidden-and-limited-card-list-ae/");
	const rawPromise = fs.promises.writeFile("raw.html", response.body);
	const cardDataJSON = response.body.split("const cardData = ")[1].split(";\n")[0];
	const jsonPromise = fs.promises.writeFile("cardData.json", cardDataJSON);
	const promises = [rawPromise, jsonPromise];

	const cardData: CardData = JSON.parse(cardDataJSON);
	for (const effectiveList of cardData.en.effective_dates) {
		const regulationDate = new Date(`01-${effectiveList.effective_date_name}`);
		const date = regulationDate.toISOString().split("T")[0];
		console.log(date);
		const lists: RegulationMap = Object.fromEntries(
			effectiveList.card_lists.map(list => [list.card_list_name, list.cards])
		);
		if ("Forbidden" in lists || "Limited" in lists || "Semi-Limited" in lists) {
			const regulation: Record<string, 0 | 1 | 2> = {};
			for (const { card_name, japanese_card_name } of lists["Forbidden"] ?? []) {
				regulation[getKonamiId(card_name, japanese_card_name)] = 0;
			}
			for (const { card_name, japanese_card_name } of lists["Limited"] ?? []) {
				regulation[getKonamiId(card_name, japanese_card_name)] = 1;
			}
			for (const { card_name, japanese_card_name } of lists["Semi-Limited"] ?? []) {
				regulation[getKonamiId(card_name, japanese_card_name)] = 2;
			}
			const result = { date, regulation };
			promises.push(fs.promises.writeFile(`${jpOutput}/${date}.vector.json`, `${JSON.stringify(result, null, 2)}\n`));
		}
		if ("Forbidden (AE)" in lists || "Limited (AE)" in lists || "Semi-Limited (AE)" in lists) {
			const regulation: Record<string, 0 | 1 | 2> = {};
			for (const { card_name } of lists["Forbidden (AE)"] ?? []) {
				regulation[getKonamiId(card_name)] = 0;
			}
			for (const { card_name } of lists["Limited (AE)"] ?? []) {
				regulation[getKonamiId(card_name)] = 1;
			}
			for (const { card_name } of lists["Semi-Limited (AE)"] ?? []) {
				regulation[getKonamiId(card_name)] = 2;
			}
			const result = { date, regulation };
			promises.push(fs.promises.writeFile(`${aeOutput}/${date}.vector.json`, `${JSON.stringify(result, null, 2)}\n`));
		}
	}
	await Promise.all(promises);
})();
