// SPDX-FileCopyrightText: © 2024 Kevin Lu
// SPDX-Licence-Identifier: AGPL-3.0-or-later

import * as fs from "fs";
import got from "got";

function normalize(name: string): string {
    return name
        .replaceAll("･","・")
        .replaceAll("·","・")
        .replaceAll("-","－")
        .replaceAll(" "," ");
}

const fetch = got.extend({
    timeout: 10000, hooks: {
        beforeRequest: [
            request => {
                console.log(`Fetching ${request.url}`);
            }
        ],
        afterResponse: [
            response => {
                const contentType = response.headers["content-type"];
                if (contentType !== "application/json") {
                    console.warn(`Received unexpected content type [${contentType}] for ${response.requestUrl}`);
                }
                return response;
            }
        ]
    }
});

(async () => {
    const zhToKonamiId = new Map<string, number>();
    const cards = JSON.parse(await fs.promises.readFile(process.argv[2], { encoding: "utf-8" }));
    for (const card of cards) {
        if (card.konami_id && card.name["zh-CN"]) {
            zhToKonamiId.set(card.name["zh-CN"], card.konami_id);
        }
    }
    const webListRequest = await fetch("https://gamekingapi.windoent.com/forbidden/forbbidengroup/webList?type=2");
    await fs.promises.writeFile("webList.json", webListRequest.body);
    const webList = JSON.parse(webListRequest.body);
    const dates = await Promise.all(webList.list.map(async (item: { name: string; id: number; }) => {
        const request = await fetch(`https://gamekingapi.windoent.com/forbidden/forbbidengroup/webinfo/${item.id}`);
        const rawPromise = fs.promises.writeFile(`${item.id}.json`, request.body);
        const data = JSON.parse(request.body);
        const [, afterColon] = data.name.split("：");
        const [yearString, afterSlash] = afterColon.split("/");
        const year = parseInt(yearString);
        const month = parseInt(afterSlash);
        const date = new Date(year, month - 1, 1);
        const dateString = date.toISOString().split("T")[0];
        const regulation: Record<string, number> = {};
        for (let i = 0; i < Math.min(3, data.list.length); i++) {""
            for (const card of data.list[i].list) {
                const kid = zhToKonamiId.get(normalize(card.name));
                if (kid) {
                    regulation[kid] = i;
                    console.log(`${dateString}: [${card.name}] limit [${i}] Konami ID [${kid}]`);
                } else {
                    console.log(`${dateString}: [${card.name}] limit [${i}] Konami ID not found`);
                }
            }
        }
        const result = { date: dateString, regulation };
        const vectorPromise = fs.promises.writeFile(`${dateString}.vector.json`, `${JSON.stringify(result, null, 2)}\n`);
        await Promise.all([rawPromise, vectorPromise]);
        return date;
    }));
    // Current Forbidden & Limited List can only be one of the two most recent (most recent may yet to be effective)
    const currentListDate = dates[0] < new Date() ? dates[0] : dates[1];
    const currentFile = currentListDate.toISOString().split("T")[0];
    const recentFile = dates[0].toISOString().split("T")[0]
    console.log(`Currently effective: ${currentFile}. Most recent: ${recentFile}`);
    await fs.promises.unlink("current.vector.json").catch(console.error);
    await fs.promises.symlink(`${currentFile}.vector.json`, "current.vector.json");
    await fs.promises.unlink("upcoming.vector.json").catch(console.error);
    if (recentFile !== currentFile) {
        await fs.promises.symlink(`${recentFile}.vector.json`, "upcoming.vector.json");
    }
})();
