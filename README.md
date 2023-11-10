# YAML Yugi Forbidden & Limited Lists (Limit Regulations)

[![Download Forbidden & Limited Lists](https://github.com/DawnbrandBots/yaml-yugi-limit-regulation/actions/workflows/limit-regulation.yaml/badge.svg)](https://github.com/DawnbrandBots/yaml-yugi-limit-regulation/actions/workflows/limit-regulation.yaml)

The [YAML Yugi](https://github.com/DawnbrandBots/yaml-yugi) project aims to create a comprehensive, machine-readable,
human-editable database of the _Yu-Gi-Oh! Trading Card Game_ and _Official Card Game_. This is an automatically-updated
collection of Forbidden & Limited Lists and Limit Regulations, found under [`/data`](/data).

The remaining files — the actual source code of this stage of the pipeline — are available under the
GNU Affero General Public License 3.0 or later. See [COPYING](./COPYING) for more details.

In each data subdirectory, current.vector.json is a symlink pointing to the most recent effective Limit Regulation for
that game version.

The TCG list effective 2022-05-23 was actually effective [2022-05-17](https://yugipedia.com/wiki/May_2022_Lists_(TCG)),
but Konami retconned this in its reported data at some point for some unknown reason. Fetch history:
- https://github.com/DawnbrandBots/yaml-yugi/commits/master/data/limit-regulation/tcg/2022-05-17.raw.json
- https://github.com/DawnbrandBots/yaml-yugi/commits/master/data/limit-regulation/tcg/2022-05-17.vector.json
