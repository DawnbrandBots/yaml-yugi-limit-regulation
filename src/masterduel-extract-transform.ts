// SPDX-FileCopyrightText: © 2023–202 Kevin Lu
// SPDX-Licence-Identifier: AGPL-3.0-or-later

import * as fs from "fs";

(async () => {
    const cards = JSON.parse(await fs.promises.readFile(process.argv[2], { encoding: "utf-8" }));
    const enNameToKonamiID = new Map();
    for (const card of cards) {
        if (card.konami_id) {
            enNameToKonamiID.set(card.name.en, card.konami_id);
        }
    }

    const today = new Date();
    let effectiveDate = new Date(0);
    let current = "";
    let mostRecentDate = new Date(0);
    let recent = "";
    const files = await fs.promises.readdir(".");
    for (const file of files) {
        if (file.endsWith(".name.json")) {
            const name = file.slice(0, 10);
            const raw = JSON.parse(await fs.promises.readFile(file, { encoding: "utf-8" }));
            const regulation = Object.fromEntries(
                Object.entries(raw).map(([name, limit]) => ([enNameToKonamiID.get(name.replace("＜", "<").replace("＞", ">")), limit]))
            );
            const vectorFile = `${name}.vector.json`;
            const result = { date: name, regulation };
            await fs.promises.writeFile(vectorFile, JSON.stringify(result, null, 2) + "\n");
            const date = new Date(name);
            if (date < today && date > effectiveDate) {
                effectiveDate = date;
                current = vectorFile;
            }
            if (date > mostRecentDate) {
                mostRecentDate = date;
                recent = vectorFile;
            }
        }
    }
    console.log(`Currently effective: ${effectiveDate}. Most recent: ${mostRecentDate}`);
    await fs.promises.unlink("current.vector.json").catch(console.error);
    await fs.promises.symlink(current, "current.vector.json");
    await fs.promises.unlink("upcoming.vector.json").catch(console.error);
    if (recent !== current) {
        await fs.promises.symlink(recent, "upcoming.vector.json");
    }
})();
