// SPDX-FileCopyrightText: © 2025 Kevin Lu, Luna Brand
// SPDX-Licence-Identifier: AGPL-3.0-or-later

import * as fs from "fs";
import got from "got";

const fetch = got.extend({
    timeout: 20000,
    hooks: {
        beforeRequest: [
            request => {
                console.log(`Fetching ${request.url}`);
            }
        ]
    }
});

async function hasChanged(rawJSON: string) {
    try {
        const oldRawJSON = await fs.promises.readFile("current.vector.json", { encoding: "utf-8" });
        return oldRawJSON !== rawJSON;
    } catch (e) {
        console.warn(e);
        return true;
    }
}

async function writeSymlink(content: string, file: string, symlink: string) {
    console.log(`Writing out ${file} as ${symlink}`);
    await fs.promises.writeFile(file, content);
    await fs.promises.unlink(symlink).catch(console.error);
    await fs.promises.symlink(file, symlink);
}

(async () => {
    const response = await fetch("https://registration.yugioh-card.com/genesys/CardListSearch/PointsList", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "resultsPerPage=20000&currentPage=1"
    }).json<any>();
    if (response.Success !== "Success") {
        console.error(response);
        process.exit(1);
    }
    if (response.Result.TotalResults > response.Result.ResultsPerPage || response.Result.TotalPages > 1) {
        console.error(response);
        process.exit(2);
    }
    const regulation = Object.fromEntries(response.Result.Results.map((card: any) => [card.KonamiId, card.Points]));
    const date = new Date().toISOString().split("T")[0];
    const result = { date, regulation };
    const vectorJSON = JSON.stringify(result, null, 2) + "\n";
    if (await hasChanged(vectorJSON)) {
        writeSymlink(JSON.stringify(response, null, 2) + "\n", `${date}.raw.json`, "current.raw.json");
        writeSymlink(vectorJSON, `${date}.vector.json`, "current.vector.json");
    } else {
        console.log("No changes.");
    }
})();
