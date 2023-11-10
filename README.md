# YAML Yugi Forbidden & Limited Lists (Limit Regulations)

[![Download Forbidden & Limited Lists](https://github.com/DawnbrandBots/yaml-yugi-limit-regulation/actions/workflows/limit-regulation.yaml/badge.svg)](https://github.com/DawnbrandBots/yaml-yugi-limit-regulation/actions/workflows/limit-regulation.yaml)

The [YAML Yugi](https://github.com/DawnbrandBots/yaml-yugi) project aims to create a comprehensive, machine-readable,
human-editable database of the _Yu-Gi-Oh! Trading Card Game_ and _Official Card Game_. This is an automatically-updated
collection of Forbidden & Limited Lists and Limit Regulations, found under [`/data`](/data).

The remaining files — the actual source code of this stage of the pipeline — are available under the
GNU Affero General Public License 3.0 or later. See [COPYING](./COPYING) for more details.

In each data subdirectory, current.vector.json is a symlink pointing to the most recent effective Limit Regulation for
that game version.

- TCG: https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/tcg/current.vector.json
- OCG: https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/ocg/current.vector.json
- Rush Duel: https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/rush/current.vector.json
- Master Duel: https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/master-duel/current.vector.json

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
