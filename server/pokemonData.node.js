// ==========================================
// pokemonData.node.js — PokeAPI データ取得＋ディスクキャッシュ（Node.js版）
// ==========================================

'use strict';

const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, 'pokemonCache.json');
const CACHE_VERSION = 7;

// チャンピオンズ登場ポケモン
const CHAMPIONS_ROSTER = [
  { id: 'venusaur', name: 'Venusaur' },
  { id: 'charizard', name: 'Charizard' },
  { id: 'blastoise', name: 'Blastoise' },
  { id: 'beedrill', name: 'Beedrill' },
  { id: 'pidgeot', name: 'Pidgeot' },
  { id: 'arbok', name: 'Arbok' },
  { id: 'pikachu', name: 'Pikachu' },
  { id: 'raichu', name: 'Raichu' },
  { id: 'raichu-alola', name: 'Raichu (Alola)', form: 'alola' },
  { id: 'clefable', name: 'Clefable' },
  { id: 'ninetales', name: 'Ninetales' },
  { id: 'ninetales-alola', name: 'Ninetales (Alola)', form: 'alola' },
  { id: 'arcanine', name: 'Arcanine' },
  { id: 'arcanine-hisui', name: 'Arcanine (Hisui)', form: 'hisui' },
  { id: 'alakazam', name: 'Alakazam' },
  { id: 'machamp', name: 'Machamp' },
  { id: 'victreebel', name: 'Victreebel' },
  { id: 'slowbro', name: 'Slowbro' },
  { id: 'slowbro-galar', name: 'Slowbro (Galar)', form: 'galar' },
  { id: 'gengar', name: 'Gengar' },
  { id: 'kangaskhan', name: 'Kangaskhan' },
  { id: 'starmie', name: 'Starmie' },
  { id: 'pinsir', name: 'Pinsir' },
  { id: 'tauros', name: 'Tauros' },
  { id: 'tauros-paldea-combat-breed', name: 'Tauros (Combat)', form: 'paldea' },
  { id: 'tauros-paldea-blaze-breed', name: 'Tauros (Blaze)', form: 'paldea' },
  { id: 'tauros-paldea-aqua-breed', name: 'Tauros (Aqua)', form: 'paldea' },
  { id: 'gyarados', name: 'Gyarados' },
  { id: 'ditto', name: 'Ditto' },
  { id: 'vaporeon', name: 'Vaporeon' },
  { id: 'jolteon', name: 'Jolteon' },
  { id: 'flareon', name: 'Flareon' },
  { id: 'aerodactyl', name: 'Aerodactyl' },
  { id: 'snorlax', name: 'Snorlax' },
  { id: 'dragonite', name: 'Dragonite' },
  { id: 'meganium', name: 'Meganium' },
  { id: 'typhlosion', name: 'Typhlosion' },
  { id: 'typhlosion-hisui', name: 'Typhlosion (Hisui)', form: 'hisui' },
  { id: 'feraligatr', name: 'Feraligatr' },
  { id: 'ariados', name: 'Ariados' },
  { id: 'ampharos', name: 'Ampharos' },
  { id: 'azumarill', name: 'Azumarill' },
  { id: 'politoed', name: 'Politoed' },
  { id: 'espeon', name: 'Espeon' },
  { id: 'umbreon', name: 'Umbreon' },
  { id: 'slowking', name: 'Slowking' },
  { id: 'slowking-galar', name: 'Slowking (Galar)', form: 'galar' },
  { id: 'forretress', name: 'Forretress' },
  { id: 'steelix', name: 'Steelix' },
  { id: 'scizor', name: 'Scizor' },
  { id: 'heracross', name: 'Heracross' },
  { id: 'skarmory', name: 'Skarmory' },
  { id: 'houndoom', name: 'Houndoom' },
  { id: 'tyranitar', name: 'Tyranitar' },
  { id: 'pelipper', name: 'Pelipper' },
  { id: 'gardevoir', name: 'Gardevoir' },
  { id: 'sableye', name: 'Sableye' },
  { id: 'aggron', name: 'Aggron' },
  { id: 'medicham', name: 'Medicham' },
  { id: 'manectric', name: 'Manectric' },
  { id: 'sharpedo', name: 'Sharpedo' },
  { id: 'camerupt', name: 'Camerupt' },
  { id: 'torkoal', name: 'Torkoal' },
  { id: 'altaria', name: 'Altaria' },
  { id: 'milotic', name: 'Milotic' },
  { id: 'castform', name: 'Castform' },
  { id: 'banette', name: 'Banette' },
  { id: 'chimecho', name: 'Chimecho' },
  { id: 'absol', name: 'Absol' },
  { id: 'glalie', name: 'Glalie' },
  { id: 'torterra', name: 'Torterra' },
  { id: 'infernape', name: 'Infernape' },
  { id: 'empoleon', name: 'Empoleon' },
  { id: 'luxray', name: 'Luxray' },
  { id: 'roserade', name: 'Roserade' },
  { id: 'rampardos', name: 'Rampardos' },
  { id: 'bastiodon', name: 'Bastiodon' },
  { id: 'lopunny', name: 'Lopunny' },
  { id: 'spiritomb', name: 'Spiritomb' },
  { id: 'garchomp', name: 'Garchomp' },
  { id: 'lucario', name: 'Lucario' },
  { id: 'hippowdon', name: 'Hippowdon' },
  { id: 'toxicroak', name: 'Toxicroak' },
  { id: 'abomasnow', name: 'Abomasnow' },
  { id: 'weavile', name: 'Weavile' },
  { id: 'rhyperior', name: 'Rhyperior' },
  { id: 'leafeon', name: 'Leafeon' },
  { id: 'glaceon', name: 'Glaceon' },
  { id: 'gliscor', name: 'Gliscor' },
  { id: 'mamoswine', name: 'Mamoswine' },
  { id: 'gallade', name: 'Gallade' },
  { id: 'froslass', name: 'Froslass' },
  { id: 'rotom', name: 'Rotom' },
  { id: 'rotom-heat', name: 'Rotom (Heat)', form: 'heat' },
  { id: 'rotom-wash', name: 'Rotom (Wash)', form: 'wash' },
  { id: 'rotom-frost', name: 'Rotom (Frost)', form: 'frost' },
  { id: 'rotom-fan', name: 'Rotom (Fan)', form: 'fan' },
  { id: 'rotom-mow', name: 'Rotom (Mow)', form: 'mow' },
  { id: 'serperior', name: 'Serperior' },
  { id: 'emboar', name: 'Emboar' },
  { id: 'samurott', name: 'Samurott' },
  { id: 'samurott-hisui', name: 'Samurott (Hisui)', form: 'hisui' },
  { id: 'watchog', name: 'Watchog' },
  { id: 'liepard', name: 'Liepard' },
  { id: 'simisage', name: 'Simisage' },
  { id: 'simisear', name: 'Simisear' },
  { id: 'simipour', name: 'Simipour' },
  { id: 'excadrill', name: 'Excadrill' },
  { id: 'audino', name: 'Audino' },
  { id: 'conkeldurr', name: 'Conkeldurr' },
  { id: 'whimsicott', name: 'Whimsicott' },
  { id: 'krookodile', name: 'Krookodile' },
  { id: 'cofagrigus', name: 'Cofagrigus' },
  { id: 'garbodor', name: 'Garbodor' },
  { id: 'zoroark', name: 'Zoroark' },
  { id: 'zoroark-hisui', name: 'Zoroark (Hisui)', form: 'hisui' },
  { id: 'reuniclus', name: 'Reuniclus' },
  { id: 'vanilluxe', name: 'Vanilluxe' },
  { id: 'emolga', name: 'Emolga' },
  { id: 'chandelure', name: 'Chandelure' },
  { id: 'beartic', name: 'Beartic' },
  { id: 'stunfisk', name: 'Stunfisk' },
  { id: 'stunfisk-galar', name: 'Stunfisk (Galar)', form: 'galar' },
  { id: 'golurk', name: 'Golurk' },
  { id: 'hydreigon', name: 'Hydreigon' },
  { id: 'volcarona', name: 'Volcarona' },
  { id: 'chesnaught', name: 'Chesnaught' },
  { id: 'delphox', name: 'Delphox' },
  { id: 'greninja', name: 'Greninja' },
  { id: 'diggersby', name: 'Diggersby' },
  { id: 'talonflame', name: 'Talonflame' },
  { id: 'vivillon', name: 'Vivillon' },
  { id: 'floette', name: 'Floette' },
  { id: 'florges', name: 'Florges' },
  { id: 'pangoro', name: 'Pangoro' },
  { id: 'furfrou', name: 'Furfrou' },
  { id: 'meowstic-male', name: 'Meowstic (♂)', form: 'male' },
  { id: 'meowstic-female', name: 'Meowstic (♀)', form: 'female' },
  { id: 'aegislash-shield', name: 'Aegislash' },
  { id: 'aromatisse', name: 'Aromatisse' },
  { id: 'slurpuff', name: 'Slurpuff' },
  { id: 'clawitzer', name: 'Clawitzer' },
  { id: 'heliolisk', name: 'Heliolisk' },
  { id: 'tyrantrum', name: 'Tyrantrum' },
  { id: 'aurorus', name: 'Aurorus' },
  { id: 'sylveon', name: 'Sylveon' },
  { id: 'hawlucha', name: 'Hawlucha' },
  { id: 'dedenne', name: 'Dedenne' },
  { id: 'goodra', name: 'Goodra' },
  { id: 'goodra-hisui', name: 'Goodra (Hisui)', form: 'hisui' },
  { id: 'klefki', name: 'Klefki' },
  { id: 'trevenant', name: 'Trevenant' },
  { id: 'gourgeist-average', name: 'Gourgeist' },
  { id: 'avalugg', name: 'Avalugg' },
  { id: 'avalugg-hisui', name: 'Avalugg (Hisui)', form: 'hisui' },
  { id: 'noivern', name: 'Noivern' },
  { id: 'decidueye', name: 'Decidueye' },
  { id: 'decidueye-hisui', name: 'Decidueye (Hisui)', form: 'hisui' },
  { id: 'incineroar', name: 'Incineroar' },
  { id: 'primarina', name: 'Primarina' },
  { id: 'toucannon', name: 'Toucannon' },
  { id: 'crabominable', name: 'Crabominable' },
  { id: 'lycanroc-midday', name: 'Lycanroc (Midday)', form: 'midday' },
  { id: 'lycanroc-midnight', name: 'Lycanroc (Midnight)', form: 'midnight' },
  { id: 'lycanroc-dusk', name: 'Lycanroc (Dusk)', form: 'dusk' },
  { id: 'toxapex', name: 'Toxapex' },
  { id: 'mudsdale', name: 'Mudsdale' },
  { id: 'araquanid', name: 'Araquanid' },
  { id: 'salazzle', name: 'Salazzle' },
  { id: 'tsareena', name: 'Tsareena' },
  { id: 'oranguru', name: 'Oranguru' },
  { id: 'passimian', name: 'Passimian' },
  { id: 'mimikyu', name: 'Mimikyu' },
  { id: 'drampa', name: 'Drampa' },
  { id: 'kommo-o', name: 'Kommo-o' },
  { id: 'corviknight', name: 'Corviknight' },
  { id: 'flapple', name: 'Flapple' },
  { id: 'appletun', name: 'Appletun' },
  { id: 'sandaconda', name: 'Sandaconda' },
  { id: 'polteageist', name: 'Polteageist' },
  { id: 'hatterene', name: 'Hatterene' },
  { id: 'mr-rime', name: 'Mr. Rime' },
  { id: 'runerigus', name: 'Runerigus' },
  { id: 'alcremie', name: 'Alcremie' },
  { id: 'morpeko', name: 'Morpeko' },
  { id: 'dragapult', name: 'Dragapult' },
  { id: 'wyrdeer', name: 'Wyrdeer' },
  { id: 'kleavor', name: 'Kleavor' },
  { id: 'basculegion-male', name: 'Basculegion (♂)', form: 'male' },
  { id: 'basculegion-female', name: 'Basculegion (♀)', form: 'female' },
  { id: 'sneasler', name: 'Sneasler' },
  { id: 'meowscarada', name: 'Meowscarada' },
  { id: 'skeledirge', name: 'Skeledirge' },
  { id: 'quaquaval', name: 'Quaquaval' },
  { id: 'maushold-family-of-four', name: 'Maushold' },
  { id: 'garganacl', name: 'Garganacl' },
  { id: 'armarouge', name: 'Armarouge' },
  { id: 'ceruledge', name: 'Ceruledge' },
  { id: 'bellibolt', name: 'Bellibolt' },
  { id: 'scovillain', name: 'Scovillain' },
  { id: 'espathra', name: 'Espathra' },
  { id: 'tinkaton', name: 'Tinkaton' },
  { id: 'palafin-zero', name: 'Palafin' },
  { id: 'orthworm', name: 'Orthworm' },
  { id: 'glimmora', name: 'Glimmora' },
  { id: 'farigiraf', name: 'Farigiraf' },
  { id: 'kingambit', name: 'Kingambit' },
  { id: 'sinistcha', name: 'Sinistcha' },
  { id: 'archaludon', name: 'Archaludon' },
  { id: 'hydrapple', name: 'Hydrapple' },
];

const MEGA_ROSTER = [
  { id: 'venusaur-mega', name: 'Mega Venusaur', baseId: 'venusaur' },
  { id: 'charizard-mega-x', name: 'Mega Charizard X', baseId: 'charizard' },
  { id: 'charizard-mega-y', name: 'Mega Charizard Y', baseId: 'charizard' },
  { id: 'blastoise-mega', name: 'Mega Blastoise', baseId: 'blastoise' },
  { id: 'beedrill-mega', name: 'Mega Beedrill', baseId: 'beedrill' },
  { id: 'pidgeot-mega', name: 'Mega Pidgeot', baseId: 'pidgeot' },
  { id: 'alakazam-mega', name: 'Mega Alakazam', baseId: 'alakazam' },
  { id: 'slowbro-mega', name: 'Mega Slowbro', baseId: 'slowbro' },
  { id: 'gengar-mega', name: 'Mega Gengar', baseId: 'gengar' },
  { id: 'kangaskhan-mega', name: 'Mega Kangaskhan', baseId: 'kangaskhan' },
  { id: 'pinsir-mega', name: 'Mega Pinsir', baseId: 'pinsir' },
  { id: 'gyarados-mega', name: 'Mega Gyarados', baseId: 'gyarados' },
  { id: 'aerodactyl-mega', name: 'Mega Aerodactyl', baseId: 'aerodactyl' },
  { id: 'steelix-mega', name: 'Mega Steelix', baseId: 'steelix' },
  { id: 'scizor-mega', name: 'Mega Scizor', baseId: 'scizor' },
  { id: 'heracross-mega', name: 'Mega Heracross', baseId: 'heracross' },
  { id: 'houndoom-mega', name: 'Mega Houndoom', baseId: 'houndoom' },
  { id: 'tyranitar-mega', name: 'Mega Tyranitar', baseId: 'tyranitar' },
  { id: 'gardevoir-mega', name: 'Mega Gardevoir', baseId: 'gardevoir' },
  { id: 'sableye-mega', name: 'Mega Sableye', baseId: 'sableye' },
  { id: 'aggron-mega', name: 'Mega Aggron', baseId: 'aggron' },
  { id: 'medicham-mega', name: 'Mega Medicham', baseId: 'medicham' },
  { id: 'manectric-mega', name: 'Mega Manectric', baseId: 'manectric' },
  { id: 'sharpedo-mega', name: 'Mega Sharpedo', baseId: 'sharpedo' },
  { id: 'camerupt-mega', name: 'Mega Camerupt', baseId: 'camerupt' },
  { id: 'altaria-mega', name: 'Mega Altaria', baseId: 'altaria' },
  { id: 'banette-mega', name: 'Mega Banette', baseId: 'banette' },
  { id: 'absol-mega', name: 'Mega Absol', baseId: 'absol' },
  { id: 'glalie-mega', name: 'Mega Glalie', baseId: 'glalie' },
  { id: 'lopunny-mega', name: 'Mega Lopunny', baseId: 'lopunny' },
  { id: 'garchomp-mega', name: 'Mega Garchomp', baseId: 'garchomp' },
  { id: 'lucario-mega', name: 'Mega Lucario', baseId: 'lucario' },
  { id: 'abomasnow-mega', name: 'Mega Abomasnow', baseId: 'abomasnow' },
  { id: 'gallade-mega', name: 'Mega Gallade', baseId: 'gallade' },
  { id: 'audino-mega', name: 'Mega Audino', baseId: 'audino' },
  { id: 'ampharos-mega', name: 'Mega Ampharos', baseId: 'ampharos' },
  { id: 'starmie-mega', name: 'Mega Starmie', baseId: 'starmie' },
  { id: 'dragonite-mega', name: 'Mega Dragonite', baseId: 'dragonite' },
  { id: 'meganium-mega', name: 'Mega Meganium', baseId: 'meganium' },
  { id: 'feraligatr-mega', name: 'Mega Feraligatr', baseId: 'feraligatr' },
  { id: 'skarmory-mega', name: 'Mega Skarmory', baseId: 'skarmory' },
  { id: 'emboar-mega', name: 'Mega Emboar', baseId: 'emboar' },
  { id: 'excadrill-mega', name: 'Mega Excadrill', baseId: 'excadrill' },
  { id: 'chandelure-mega', name: 'Mega Chandelure', baseId: 'chandelure' },
  { id: 'golurk-mega', name: 'Mega Golurk', baseId: 'golurk' },
  { id: 'chesnaught-mega', name: 'Mega Chesnaught', baseId: 'chesnaught' },
  { id: 'delphox-mega', name: 'Mega Delphox', baseId: 'delphox' },
  { id: 'greninja-mega', name: 'Mega Greninja', baseId: 'greninja' },
  { id: 'floette-mega', name: 'Mega Floette', baseId: 'floette' },
  { id: 'hawlucha-mega', name: 'Mega Hawlucha', baseId: 'hawlucha' },
  { id: 'crabominable-mega', name: 'Mega Crabominable', baseId: 'crabominable' },
  { id: 'drampa-mega', name: 'Mega Drampa', baseId: 'drampa' },
  { id: 'scovillain-mega', name: 'Mega Scovillain', baseId: 'scovillain' },
  { id: 'glimmora-mega', name: 'Mega Glimmora', baseId: 'glimmora' },
  { id: 'froslass-mega', name: 'Mega Froslass', baseId: 'froslass' },
  { id: 'chimecho-mega', name: 'Mega Chimecho', baseId: 'chimecho' },
  { id: 'clefable-mega', name: 'Mega Clefable', baseId: 'clefable' },
  { id: 'victreebel-mega', name: 'Mega Victreebel', baseId: 'victreebel' },
];

const MEGA_TYPE_OVERRIDES = {
  'venusaur-mega': ['grass', 'poison'], 'charizard-mega-x': ['fire', 'dragon'],
  'charizard-mega-y': ['fire', 'flying'], 'blastoise-mega': ['water'],
  'beedrill-mega': ['bug', 'poison'], 'pidgeot-mega': ['normal', 'flying'],
  'alakazam-mega': ['psychic'], 'slowbro-mega': ['water', 'psychic'],
  'gengar-mega': ['ghost', 'poison'], 'kangaskhan-mega': ['normal'],
  'pinsir-mega': ['bug', 'flying'], 'gyarados-mega': ['water', 'dark'],
  'aerodactyl-mega': ['rock', 'flying'], 'steelix-mega': ['steel', 'ground'],
  'scizor-mega': ['bug', 'steel'], 'heracross-mega': ['bug', 'fighting'],
  'houndoom-mega': ['dark', 'fire'], 'tyranitar-mega': ['rock', 'dark'],
  'gardevoir-mega': ['psychic', 'fairy'], 'sableye-mega': ['dark', 'ghost'],
  'aggron-mega': ['steel'], 'medicham-mega': ['fighting', 'psychic'],
  'manectric-mega': ['electric'], 'sharpedo-mega': ['water', 'dark'],
  'camerupt-mega': ['fire', 'ground'], 'altaria-mega': ['dragon', 'fairy'],
  'banette-mega': ['ghost'], 'absol-mega': ['dark'], 'glalie-mega': ['ice'],
  'lopunny-mega': ['normal', 'fighting'], 'garchomp-mega': ['dragon', 'ground'],
  'lucario-mega': ['fighting', 'steel'], 'abomasnow-mega': ['grass', 'ice'],
  'gallade-mega': ['psychic', 'fighting'], 'audino-mega': ['normal', 'fairy'],
  'ampharos-mega': ['electric', 'dragon'],
  'starmie-mega': ['water', 'psychic'], 'dragonite-mega': ['dragon', 'flying'],
  'meganium-mega': ['grass', 'fairy'], 'feraligatr-mega': ['water', 'dragon'],
  'skarmory-mega': ['steel', 'flying'], 'emboar-mega': ['fire', 'fighting'],
  'excadrill-mega': ['ground', 'steel'], 'chandelure-mega': ['ghost', 'fire'],
  'golurk-mega': ['ground', 'ghost'], 'chesnaught-mega': ['grass', 'fighting'],
  'delphox-mega': ['fire', 'psychic'], 'greninja-mega': ['water', 'dark'],
  'floette-mega': ['fairy'], 'hawlucha-mega': ['fighting', 'flying'],
  'crabominable-mega': ['fighting', 'ice'], 'drampa-mega': ['normal', 'dragon'],
  'scovillain-mega': ['grass', 'fire'], 'glimmora-mega': ['rock', 'poison'],
  'froslass-mega': ['ice', 'ghost'], 'chimecho-mega': ['psychic', 'steel'],
  'clefable-mega': ['fairy', 'flying'], 'victreebel-mega': ['grass', 'poison'],
};

const MEGA_ABILITY_OVERRIDES = {
  'venusaur-mega': ['thick-fat'],
  'charizard-mega-y': ['drought'],
  'aggron-mega': ['filter'],
  'altaria-mega': ['pixilate']
};

const FORM_LABELS = {
  'alola': 'アローラ', 'galar': 'ガラル', 'hisui': 'ヒスイ',
  'paldea': 'パルデア', 'heat': 'ヒート', 'wash': 'ウォッシュ',
  'frost': 'フロスト', 'fan': 'スピン', 'mow': 'カット',
  'midday': 'まひる', 'midnight': 'まよなか', 'dusk': 'たそがれ',
  'male': '♂', 'female': '♀'
};

const POKEAPI_ID_ALIASES = {
  'mimikyu': 'mimikyu-disguised',
  'morpeko': 'morpeko-full-belly'
};

async function fetchJson(url) {
  // Node.js 18+ の built-in fetch を使用
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function loadAllPokemon(onProgress) {
  // ディスクキャッシュチェック
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      if (cached.version === CACHE_VERSION && cached.data && cached.data.length > 0) {
        console.log(`[PokemonData] Loaded ${cached.data.length} pokemon from cache`);
        return cached.data;
      }
    } catch (e) {
      console.warn('[PokemonData] Cache read failed, refetching:', e.message);
    }
  }

  console.log('[PokemonData] Fetching from PokeAPI...');
  const total = CHAMPIONS_ROSTER.length + MEGA_ROSTER.length;
  let loaded = 0;
  const BATCH = 20;

  const baseDataMap = {};
  const jaNameMap = {};

  // Step 1: 通常形態
  for (let i = 0; i < CHAMPIONS_ROSTER.length; i += BATCH) {
    const batch = CHAMPIONS_ROSTER.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async (entry) => {
      try {
        const primaryId = entry.id;
        const fallbackId = POKEAPI_ID_ALIASES[primaryId];
        let data;
        try {
          data = await fetchJson(`https://pokeapi.co/api/v2/pokemon/${primaryId}`);
        } catch (e) {
          if (fallbackId) data = await fetchJson(`https://pokeapi.co/api/v2/pokemon/${fallbackId}`);
          else return { entry, data: null };
        }
        return { entry, data };
      } catch { return { entry, data: null }; }
    }));

    for (const { entry, data } of results) {
      loaded++;
      if (onProgress) onProgress(loaded, total);
      if (!data) continue;
      const types = data.types.map(t => t.type.name);
      const stats = {};
      data.stats.forEach(s => { stats[s.stat.name] = s.base_stat; });
      const bst = Object.values(stats).reduce((a, b) => a + b, 0);
      const sprite = data.sprites.front_default || '';
      const speciesId = data.species?.url?.match(/\/(\d+)\//)?.[1];
      const abilities = data.abilities ? data.abilities.map(a => a.ability.name) : [];
      baseDataMap[entry.id] = { types, stats, bst, sprite, speciesId, abilities };
    }
  }

  // Step 2: Species (日本語名)
  const uniqueSpeciesIds = [...new Set(Object.values(baseDataMap).map(d => d.speciesId).filter(Boolean))];
  for (let i = 0; i < uniqueSpeciesIds.length; i += BATCH) {
    const batch = uniqueSpeciesIds.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async (sid) => {
      try {
        const data = await fetchJson(`https://pokeapi.co/api/v2/pokemon-species/${sid}`);
        const ja = data.names.find(n => n.language.name === 'ja');
        return { sid, name: ja ? ja.name : null };
      } catch { return { sid, name: null }; }
    }));
    for (const { sid, name } of results) {
      if (name) jaNameMap[sid] = name;
    }
  }

  // Step 3: アセンブル
  const allResults = [];
  for (const entry of CHAMPIONS_ROSTER) {
    const d = baseDataMap[entry.id];
    if (!d) continue;
    let jaName = entry.name;
    if (d.speciesId && jaNameMap[d.speciesId]) {
      jaName = jaNameMap[d.speciesId];
      if (entry.form) jaName += `(${FORM_LABELS[entry.form] || entry.form})`;
    }
    allResults.push({
      id: entry.id, name: entry.name, jaName, types: d.types,
      stats: d.stats, bst: d.bst, sprite: d.sprite,
      isMega: false, baseId: null, abilities: d.abilities || []
    });
  }

  // Step 4: メガシンカ
  for (let i = 0; i < MEGA_ROSTER.length; i += BATCH) {
    const batch = MEGA_ROSTER.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async (mega) => {
      try {
        const data = await fetchJson(`https://pokeapi.co/api/v2/pokemon/${mega.id}`);
        return { mega, data };
      } catch { return { mega, data: null }; }
    }));

    for (const { mega, data } of results) {
      loaded++;
      if (onProgress) onProgress(loaded, total);
      const baseData = baseDataMap[mega.baseId];
      if (!baseData) continue;

      let jaName = mega.name;
      if (baseData.speciesId && jaNameMap[baseData.speciesId]) {
        jaName = 'メガ' + jaNameMap[baseData.speciesId];
        if (mega.id.endsWith('-x')) jaName += ' X';
        if (mega.id.endsWith('-y')) jaName += ' Y';
      }

      const megaTypes = MEGA_TYPE_OVERRIDES[mega.id] || baseData.types;
      const megaAbilities = MEGA_ABILITY_OVERRIDES[mega.id] || baseData.abilities || [];
      let stats = baseData.stats, bst = baseData.bst, sprite = baseData.sprite;

      if (data) {
        stats = {};
        data.stats.forEach(s => { stats[s.stat.name] = s.base_stat; });
        bst = Object.values(stats).reduce((a, b) => a + b, 0);
        sprite = data.sprites.front_default || baseData.sprite;
      }

      allResults.push({
        id: mega.id, name: mega.name, jaName, types: megaTypes,
        stats, bst, sprite, isMega: true, baseId: mega.baseId,
        abilities: megaAbilities
      });
    }
  }

  // キャッシュ保存
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ version: CACHE_VERSION, data: allResults, timestamp: Date.now() }));
    console.log(`[PokemonData] Cached ${allResults.length} pokemon to ${CACHE_FILE}`);
  } catch (e) {
    console.warn('[PokemonData] Cache write failed:', e.message);
  }

  return allResults;
}

module.exports = { loadAllPokemon, CHAMPIONS_ROSTER, MEGA_ROSTER };
