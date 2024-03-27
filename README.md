# YAML Yugi Forbidden & Limited Lists (Limit Regulations)

An automatically-updated database and JSON API of Yu-Gi-Oh! Forbidden & Limited Lists, also known as Limit Regulations
(colloquially, "banlists"). Covers the _Trading Card Game_ (TCG), _Official Card Game_ (OCG), _Master Duel_ video game,
and _Rush Duel_. This forms part of the [YAML Yugi](https://github.com/DawnbrandBots/yaml-yugi) project.

The collection of limit regulations is found under [`/data`](/data) and published to GitHub Pages to serve the API.
In each data subdirectory, current.vector.json is a symlink pointing to the most recent effective limit regulation for
that game version.

- TCG: https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/tcg/current.vector.json
- OCG: https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/ocg/current.vector.json
- Rush Duel: https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/rush/current.vector.json
- Master Duel: https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/master-duel/current.vector.json

If a newer list has been announced but it is not yet the effective date, then an upcoming.vector.json symlink will be
present in that data subdirectory alongside current.vector.json. All served vector JSONs are guaranteed to conform to
[the JSON schema](src/vector.schema.yaml), and this is validated after every daily download.

The remaining files outside of `/data` — the actual source code of this stage of the pipeline — are available under the
GNU Affero General Public License 3.0 or later. See [COPYING](./COPYING) for more details.

[![Download Forbidden & Limited Lists](https://github.com/DawnbrandBots/yaml-yugi-limit-regulation/actions/workflows/limit-regulation.yaml/badge.svg)](https://github.com/DawnbrandBots/yaml-yugi-limit-regulation/actions/workflows/limit-regulation.yaml)

## Notes

The TCG list effective 2022-05-23 was actually effective [2022-05-17](https://yugipedia.com/wiki/May_2022_Lists_(TCG)),
but Konami retconned this in its reported data at some point for some unknown reason. Fetch history:
- https://github.com/DawnbrandBots/yaml-yugi/commits/master/data/limit-regulation/tcg/2022-05-17.raw.json
- https://github.com/DawnbrandBots/yaml-yugi/commits/master/data/limit-regulation/tcg/2022-05-17.vector.json

Yugipedia categories for yaml-yugipedia, including subcategories for the OCG:
- https://yugipedia.com/wiki/Category:TCG_Forbidden_%26_Limited_Lists
- https://yugipedia.com/wiki/Category:OCG_Forbidden_%26_Limited_Lists
- https://yugipedia.com/wiki/Category:Yu-Gi-Oh!_Master_Duel_Forbidden_%26_Limited_Lists
- https://yugipedia.com/wiki/Category:Yu-Gi-Oh!_Duel_Links_Forbidden_%26_Limited_Lists (damaged)
- https://yugipedia.com/wiki/Category:Speed_Duel_Forbidden_%26_Limited_Lists

Official sources:
- Card database (all regions except China): https://www.db.yugioh-card.com/yugiohdb/forbidden_limited.action
- TCG (including historical): https://www.yugioh-card.com/eu/play/forbidden-and-limited-list/
  - US: https://www.yugioh-card.com/en/limited/
  - LATAM (current only): https://www.yugioh-card.com/lat-am/limited/index.html
  - TCG cards not legal in EU: https://www.yugioh-card.com/eu/play/card-legality/
- OCG Japan (including historical): https://www.yugioh-card.com/japan/event/rankingduel/limitregulation/
  - English version (can also be found at `my`, `sg`, `tw`, `ph`): https://www.yugioh-card.com/hk/event/rules_guides/forbidden_cardlist.php
- OCG Korea (current only): https://yugioh.co.kr/site/limit_regulation.php
- OCG China (including historical): https://www.yugioh-card-cn.com/simplifiedLimitRegulation
- Rush Duel card database: https://www.db.yugioh-card.com/rushdb/forbidden_limited.action
- Rush Duel (including upcoming): https://www.konami.com/yugioh/rushduel/howto/limitregulation/

[Original topic issue](https://github.com/DawnbrandBots/yaml-yugi/issues/8)
