// ==========================================
// pokemonData.js — チャンピオンズ登場ポケモンデータ
// ==========================================

// チャンピオンズ登場ポケモン（通常形態 + リージョン）
const CHAMPIONS_ROSTER = [
  // ===== Gen 1 =====
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
  // ===== Gen 2 =====
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
  // ===== Gen 3 =====
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
  // ===== Gen 4 =====
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
  // ===== Gen 5 =====
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
  // ===== Gen 6 =====
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
  // ===== Gen 7 =====
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
  // ===== Gen 8 =====
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
  // ===== Legends Arceus =====
  { id: 'wyrdeer', name: 'Wyrdeer' },
  { id: 'kleavor', name: 'Kleavor' },
  { id: 'basculegion-male', name: 'Basculegion (♂)', form: 'male' },
  { id: 'basculegion-female', name: 'Basculegion (♀)', form: 'female' },
  { id: 'sneasler', name: 'Sneasler' },
  // ===== Gen 9 =====
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

// ==========================================
// 使用率・技使用率データ（シングルバトル）
// ==========================================
// データソース: ポケモン徹底攻略 (yakkun.com) チャンピオンズ・シングルバトル使用率ランキング
// データ更新日: 2026/04/23
//
// moves: タイプ別の最大採用率（技初期化用）
// moveNames: よく使う技の名前リスト（UI表示用）
// items: よく持つ持ち物リスト（UI表示用）
window.POKEMON_USAGE = {
  // === 1位: ガブリアス ===
  'garchomp': {
    usage: 0.95, rank: 1,
    moves: { 'ground': 0.99, 'dragon': 0.62, 'rock': 0.53, 'poison': 0.24 },
    moveNames: [
      { name: 'じしん', rate: 98.9 },
      { name: 'げきりん', rate: 62.3 },
      { name: 'ステルスロック', rate: 52.8 },
      { name: 'がんせきふうじ', rate: 44.8 },
      { name: 'どくづき', rate: 24.3 }
    ],
    items: [
      { name: 'こだわりスカーフ', rate: 29.9 },
      { name: 'オボンのみ', rate: 13.0 },
      { name: 'ラムのみ', rate: 7.0 },
      { name: 'ガブリアスナイト', rate: 1.9 }
    ]
  },
  // === 2位: アシレーヌ ===
  'primarina': {
    usage: 0.85, rank: 2,
    moves: { 'fairy': 0.96, 'water': 0.89, 'normal': 0.35 },
    moveNames: [
      { name: 'ムーンフォース', rate: 96.0 },
      { name: 'うたかたのアリア', rate: 89.3 },
      { name: 'アクアジェット', rate: 67.0 },
      { name: 'クイックターン', rate: 40.2 },
      { name: 'アンコール', rate: 35.2 }
    ],
    items: [
      { name: 'オボンのみ', rate: 46.7 },
      { name: 'たべのこし', rate: 20.1 },
      { name: 'しんぴのしずく', rate: 10.1 },
      { name: 'きあいのタスキ', rate: 7.6 }
    ]
  },
  // === 3位: メガリザードンY ===
  'charizard-mega-y': {
    usage: 0.80, rank: 3,
    moves: { 'grass': 0.67, 'fire': 0.44, 'flying': 0.32 },
    moveNames: [
      { name: 'ソーラービーム', rate: 67.2 },
      { name: 'ニトロチャージ', rate: 44.2 },
      { name: 'かえんほうしゃ', rate: 40.3 },
      { name: 'オーバーヒート', rate: 34.2 },
      { name: 'エアスラッシュ', rate: 31.6 }
    ],
    items: [
      { name: 'リザードナイトY', rate: 67.9 },
      { name: 'リザードナイトX', rate: 30.7 }
    ]
  },
  // リザードン通常形態にも同データを参照用に
  'charizard': {
    usage: 0.80, rank: 3,
    moves: { 'grass': 0.67, 'fire': 0.44, 'flying': 0.32 },
    moveNames: [
      { name: 'ソーラービーム', rate: 67.2 },
      { name: 'ニトロチャージ', rate: 44.2 },
      { name: 'かえんほうしゃ', rate: 40.3 },
      { name: 'オーバーヒート', rate: 34.2 },
      { name: 'エアスラッシュ', rate: 31.6 }
    ],
    items: [
      { name: 'リザードナイトY', rate: 67.9 },
      { name: 'リザードナイトX', rate: 30.7 }
    ]
  },
  // === 4位: アーマーガア ===
  'corviknight': {
    usage: 0.75, rank: 4,
    moves: { 'flying': 0.97, 'fighting': 0.88, 'steel': 0.77, 'bug': 0.63 },
    moveNames: [
      { name: 'はねやすめ', rate: 96.7 },
      { name: 'ボディプレス', rate: 88.0 },
      { name: 'てっぺき', rate: 76.6 },
      { name: 'とんぼがえり', rate: 62.8 },
      { name: 'アイアンヘッド', rate: 24.7 }
    ],
    items: [
      { name: 'たべのこし', rate: 67.4 },
      { name: 'オボンのみ', rate: 20.7 },
      { name: 'ゴツゴツメット', rate: 10.0 }
    ]
  },
  // === 5位: ブリジュラス ===
  'archaludon': {
    usage: 0.70, rank: 5,
    moves: { 'steel': 0.78, 'dragon': 0.70, 'electric': 0.55, 'rock': 0.53, 'fighting': 0.30 },
    moveNames: [
      { name: 'ラスターカノン', rate: 77.9 },
      { name: 'りゅうせいぐん', rate: 70.1 },
      { name: '10まんボルト', rate: 55.3 },
      { name: 'ステルスロック', rate: 52.7 },
      { name: 'ボディプレス', rate: 30.0 }
    ],
    items: [
      { name: 'たべのこし', rate: 32.4 },
      { name: 'オボンのみ', rate: 28.9 },
      { name: 'パワフルハーブ', rate: 20.6 },
      { name: 'とつげきチョッキ', rate: 15.0 }
    ]
  },
  // === 6位: カバルドン ===
  'hippowdon': {
    usage: 0.65, rank: 6,
    moves: { 'rock': 0.95, 'normal': 0.91, 'ground': 0.89 },
    moveNames: [
      { name: 'ステルスロック', rate: 95.0 },
      { name: 'ふきとばし', rate: 91.4 },
      { name: 'じしん', rate: 88.6 },
      { name: 'なまける', rate: 85.7 },
      { name: 'あくび', rate: 40.0 }
    ],
    items: [
      { name: 'オボンのみ', rate: 68.9 },
      { name: 'たべのこし', rate: 26.5 },
      { name: 'ゴツゴツメット', rate: 4.0 }
    ]
  },
  // === 7位: メガゲンガー ===
  'gengar-mega': {
    usage: 0.60, rank: 7,
    moves: { 'ghost': 0.98, 'poison': 0.87, 'fighting': 0.23 },
    moveNames: [
      { name: 'シャドーボール', rate: 98.2 },
      { name: 'ヘドロばくだん', rate: 87.4 },
      { name: 'みちづれ', rate: 62.3 },
      { name: 'アンコール', rate: 45.1 },
      { name: 'きあいだま', rate: 22.8 }
    ],
    items: [
      { name: 'ゲンガナイト', rate: 91.4 },
      { name: 'こだわりスカーフ', rate: 3.6 }
    ]
  },
  'gengar': {
    usage: 0.60, rank: 7,
    moves: { 'ghost': 0.98, 'poison': 0.87, 'fighting': 0.23 },
    moveNames: [
      { name: 'シャドーボール', rate: 98.2 },
      { name: 'ヘドロばくだん', rate: 87.4 },
      { name: 'みちづれ', rate: 62.3 },
      { name: 'アンコール', rate: 45.1 },
      { name: 'きあいだま', rate: 22.8 }
    ],
    items: [
      { name: 'ゲンガナイト', rate: 91.4 },
      { name: 'こだわりスカーフ', rate: 3.6 }
    ]
  },
  // === 8位: メガハッサム ===
  'scizor-mega': {
    usage: 0.58, rank: 8,
    moves: { 'steel': 1.00, 'bug': 0.84, 'fighting': 0.42 },
    moveNames: [
      { name: 'バレットパンチ', rate: 99.8 },
      { name: 'とんぼがえり', rate: 84.1 },
      { name: 'つるぎのまい', rate: 78.3 },
      { name: 'はねやすめ', rate: 62.2 },
      { name: 'インファイト', rate: 41.6 }
    ],
    items: [
      { name: 'ハッサムナイト', rate: 97.9 },
      { name: 'いのちのたま', rate: 1.1 }
    ]
  },
  'scizor': {
    usage: 0.58, rank: 8,
    moves: { 'steel': 1.00, 'bug': 0.84, 'fighting': 0.42 },
    moveNames: [
      { name: 'バレットパンチ', rate: 99.8 },
      { name: 'とんぼがえり', rate: 84.1 },
      { name: 'つるぎのまい', rate: 78.3 },
      { name: 'はねやすめ', rate: 62.2 },
      { name: 'インファイト', rate: 41.6 }
    ],
    items: [
      { name: 'ハッサムナイト', rate: 97.9 },
      { name: 'いのちのたま', rate: 1.1 }
    ]
  },
  // === 9位: ギルガルド ===
  'aegislash-shield': {
    usage: 0.55, rank: 9,
    moves: { 'ghost': 0.95, 'steel': 0.70, 'fighting': 0.43 },
    moveNames: [
      { name: 'かげうち', rate: 94.8 },
      { name: 'キングシールド', rate: 69.9 },
      { name: 'ポルターガイスト', rate: 68.2 },
      { name: 'せいなるつるぎ', rate: 42.5 },
      { name: 'つるぎのまい', rate: 33.0 }
    ],
    items: [
      { name: 'のろいのおふだ', rate: 43.3 },
      { name: 'たべのこし', rate: 38.5 },
      { name: 'きあいのタスキ', rate: 7.2 }
    ]
  },
  // === 10位: メガカイリュー ===
  'dragonite-mega': {
    usage: 0.52, rank: 10,
    moves: { 'dragon': 0.68, 'normal': 0.66, 'electric': 0.48, 'fire': 0.44, 'flying': 0.38 },
    moveNames: [
      { name: 'りゅうせいぐん', rate: 68.2 },
      { name: 'しんそく', rate: 65.5 },
      { name: '10まんボルト', rate: 47.9 },
      { name: 'かえんほうしゃ', rate: 44.1 },
      { name: 'エアスラッシュ', rate: 37.7 }
    ],
    items: [
      { name: 'カイリューナイト', rate: 82.5 },
      { name: 'ラムのみ', rate: 7.9 }
    ]
  },
  'dragonite': {
    usage: 0.52, rank: 10,
    moves: { 'dragon': 0.68, 'normal': 0.66, 'electric': 0.48, 'fire': 0.44, 'flying': 0.38 },
    moveNames: [
      { name: 'りゅうせいぐん', rate: 68.2 },
      { name: 'しんそく', rate: 65.5 },
      { name: '10まんボルト', rate: 47.9 },
      { name: 'かえんほうしゃ', rate: 44.1 },
      { name: 'エアスラッシュ', rate: 37.7 }
    ],
    items: [
      { name: 'カイリューナイト', rate: 82.5 },
      { name: 'ラムのみ', rate: 7.9 }
    ]
  },
  // === 11位: マスカーニャ ===
  'meowscarada': {
    usage: 0.48, rank: 11,
    moves: { 'grass': 0.99, 'dark': 0.92, 'bug': 0.37 },
    moveNames: [
      { name: 'トリックフラワー', rate: 99.1 },
      { name: 'はたきおとす', rate: 92.4 },
      { name: 'ふいうち', rate: 87.8 },
      { name: 'とんぼがえり', rate: 37.1 }
    ],
    items: [
      { name: 'きあいのタスキ', rate: 89.9 },
      { name: 'ラムのみ', rate: 3.9 }
    ]
  },
  // === 12位: ドドゲザン ===
  'kingambit': {
    usage: 0.45, rank: 12,
    moves: { 'dark': 0.97, 'steel': 0.82, 'fighting': 0.24 },
    moveNames: [
      { name: 'ふいうち', rate: 96.8 },
      { name: 'ドゲザン', rate: 88.1 },
      { name: 'アイアンヘッド', rate: 82.4 },
      { name: 'つるぎのまい', rate: 75.9 },
      { name: 'けたぐり', rate: 24.3 }
    ],
    items: [
      { name: 'くろいメガネ', rate: 29.3 },
      { name: 'たべのこし', rate: 22.7 },
      { name: 'いのちのたま', rate: 17.5 }
    ]
  },
  // === 13位: イダイトウ♂ ===
  'basculegion-male': {
    usage: 0.42, rank: 13,
    moves: { 'water': 0.99, 'ghost': 0.97 },
    moveNames: [
      { name: 'ウェーブタックル', rate: 99.4 },
      { name: 'おはかまいり', rate: 96.9 },
      { name: 'アクアジェット', rate: 87.2 },
      { name: 'シャドーダイブ', rate: 13.1 }
    ],
    items: [
      { name: 'こだわりハチマキ', rate: 43.2 },
      { name: 'いのちのたま', rate: 25.5 },
      { name: 'こだわりスカーフ', rate: 14.0 }
    ]
  },
  // === 14位: ミミッキュ ===
  'mimikyu': {
    usage: 0.40, rank: 14,
    moves: { 'fairy': 0.95, 'ghost': 0.90 },
    moveNames: [
      { name: 'じゃれつく', rate: 95.3 },
      { name: 'シャドークロー', rate: 90.1 },
      { name: 'つるぎのまい', rate: 83.5 },
      { name: 'かげうち', rate: 76.2 },
      { name: 'のろい', rate: 12.8 }
    ],
    items: [
      { name: 'いのちのたま', rate: 48.5 },
      { name: 'アッキのみ', rate: 16.5 },
      { name: 'ひかりのこな', rate: 10.2 }
    ]
  },
  // === 15位: メガミミロップ ===
  'lopunny-mega': {
    usage: 0.38, rank: 15,
    moves: { 'normal': 0.93, 'fighting': 0.89, 'ice': 0.54, 'electric': 0.23 },
    moveNames: [
      { name: 'すてみタックル', rate: 92.9 },
      { name: 'とびひざげり', rate: 88.6 },
      { name: 'れいとうパンチ', rate: 53.7 },
      { name: 'ねこだまし', rate: 44.3 },
      { name: 'かみなりパンチ', rate: 22.7 }
    ],
    items: [
      { name: 'ミミロップナイト', rate: 97.7 }
    ]
  },
  // === 16位: サザンドラ ===
  'hydreigon': {
    usage: 0.35, rank: 16,
    moves: { 'dark': 0.97, 'dragon': 0.84, 'fire': 0.54, 'steel': 0.45, 'fighting': 0.18 },
    moveNames: [
      { name: 'あくのはどう', rate: 97.1 },
      { name: 'りゅうせいぐん', rate: 83.5 },
      { name: 'だいもんじ', rate: 53.6 },
      { name: 'ラスターカノン', rate: 45.2 },
      { name: 'きあいだま', rate: 17.9 }
    ],
    items: [
      { name: 'こだわりメガネ', rate: 35.3 },
      { name: 'とつげきチョッキ', rate: 32.8 },
      { name: 'こだわりスカーフ', rate: 20.0 }
    ]
  },
  // === 17位: ウォッシュロトム ===
  'rotom-wash': {
    usage: 0.33, rank: 17,
    moves: { 'water': 0.95, 'electric': 0.88 },
    moveNames: [
      { name: 'ハイドロポンプ', rate: 94.9 },
      { name: 'ボルトチェンジ', rate: 87.8 },
      { name: 'おにび', rate: 63.2 },
      { name: '10まんボルト', rate: 55.0 },
      { name: 'トリック', rate: 23.7 }
    ],
    items: [
      { name: 'オボンのみ', rate: 33.5 },
      { name: 'たべのこし', rate: 30.4 },
      { name: 'こだわりスカーフ', rate: 15.1 }
    ]
  },
  // === 18位: キラフロル ===
  'glimmora': {
    usage: 0.30, rank: 18,
    moves: { 'rock': 0.99, 'poison': 0.41, 'grass': 0.59 },
    moveNames: [
      { name: 'ステルスロック', rate: 98.6 },
      { name: 'パワージェム', rate: 84.3 },
      { name: 'エナジーボール', rate: 58.8 },
      { name: 'キラースピン', rate: 41.2 },
      { name: 'だいばくはつ', rate: 38.7 }
    ],
    items: [
      { name: 'きあいのタスキ', rate: 88.2 },
      { name: 'パワフルハーブ', rate: 5.2 }
    ]
  },
  // === 19位: ブラッキー ===
  'umbreon': {
    usage: 0.28, rank: 19,
    moves: { 'dark': 0.89 },
    moveNames: [
      { name: 'あくび', rate: 96.1 },
      { name: 'イカサマ', rate: 89.0 },
      { name: 'ねがいごと', rate: 85.3 },
      { name: 'まもる', rate: 76.1 },
      { name: 'つきのひかり', rate: 14.6 }
    ],
    items: [
      { name: 'たべのこし', rate: 76.9 },
      { name: 'オボンのみ', rate: 11.2 },
      { name: 'ゴツゴツメット', rate: 4.8 }
    ]
  },
  // === 20位: メガマフォクシー ===
  'delphox-mega': {
    usage: 0.26, rank: 20,
    moves: { 'fire': 0.89, 'psychic': 0.81, 'grass': 0.54 },
    moveNames: [
      { name: 'だいもんじ', rate: 89.2 },
      { name: 'サイコキネシス', rate: 81.1 },
      { name: 'くさむすび', rate: 53.6 },
      { name: 'マジカルフレイム', rate: 49.0 },
      { name: 'トリックルーム', rate: 15.2 }
    ],
    items: [
      { name: 'マフォクシーナイト', rate: 93.4 },
      { name: 'きあいのタスキ', rate: 3.1 }
    ]
  },
  // === 21位: メガルカリオ ===
  'lucario-mega': {
    usage: 0.24, rank: 21,
    moves: { 'fighting': 0.94, 'steel': 0.88 },
    moveNames: [
      { name: 'インファイト', rate: 94.3 },
      { name: 'バレットパンチ', rate: 88.0 },
      { name: 'つるぎのまい', rate: 72.5 },
      { name: 'しんそく', rate: 51.1 },
      { name: 'コメットパンチ', rate: 23.8 }
    ],
    items: [
      { name: 'ルカリオナイト', rate: 96.3 }
    ]
  },
  // === 22位: メガメガニウム ===
  'meganium-mega': {
    usage: 0.22, rank: 22,
    moves: { 'grass': 0.87, 'fairy': 0.82, 'ground': 0.40 },
    moveNames: [
      { name: 'ギガドレイン', rate: 86.6 },
      { name: 'ムーンフォース', rate: 82.3 },
      { name: 'やどりぎのタネ', rate: 68.0 },
      { name: 'じしん', rate: 40.1 },
      { name: 'アロマセラピー', rate: 28.3 }
    ],
    items: [
      { name: 'メガニウムナイト', rate: 94.9 }
    ]
  },
  // === 23位: ゲッコウガ ===
  'greninja': {
    usage: 0.20, rank: 23,
    moves: { 'water': 0.91, 'dark': 0.87, 'ice': 0.56, 'grass': 0.33, 'poison': 0.17 },
    moveNames: [
      { name: 'ハイドロカノン', rate: 91.4 },
      { name: 'あくのはどう', rate: 86.5 },
      { name: 'れいとうビーム', rate: 55.8 },
      { name: 'くさむすび', rate: 33.0 },
      { name: 'ダストシュート', rate: 17.0 }
    ],
    items: [
      { name: 'きあいのタスキ', rate: 62.7 },
      { name: 'いのちのたま', rate: 18.5 }
    ]
  },
  // === 24位: メガギャラドス ===
  'gyarados-mega': {
    usage: 0.18, rank: 24,
    moves: { 'water': 0.93, 'dark': 0.88, 'ground': 0.50, 'grass': 0.13 },
    moveNames: [
      { name: 'たきのぼり', rate: 92.9 },
      { name: 'かみくだく', rate: 87.9 },
      { name: 'りゅうのまい', rate: 82.1 },
      { name: 'じしん', rate: 49.7 },
      { name: 'パワーウィップ', rate: 12.6 }
    ],
    items: [
      { name: 'ギャラドスナイト', rate: 95.6 }
    ]
  },
  // === 25位: メガガルーラ ===
  'kangaskhan-mega': {
    usage: 0.16, rank: 25,
    moves: { 'normal': 0.88, 'fighting': 0.66, 'fire': 0.36, 'ground': 0.34 },
    moveNames: [
      { name: 'すてみタックル', rate: 88.3 },
      { name: 'グロウパンチ', rate: 65.7 },
      { name: 'ふいうち', rate: 62.1 },
      { name: 'ほのおのパンチ', rate: 36.2 },
      { name: 'じしん', rate: 33.5 }
    ],
    items: [
      { name: 'ガルーラナイト', rate: 97.2 }
    ]
  },
  // === 26位: メガフラエッテ ===
  'floette-mega': {
    usage: 0.15, rank: 26,
    moves: { 'fairy': 0.97, 'fire': 0.72, 'psychic': 0.51 },
    moveNames: [
      { name: 'ムーンフォース', rate: 96.6 },
      { name: 'マジカルフレイム', rate: 72.3 },
      { name: 'サイコキネシス', rate: 51.4 },
      { name: 'めいそう', rate: 47.9 },
      { name: 'つきのひかり', rate: 39.3 }
    ],
    items: [
      { name: 'フラエッテナイト', rate: 96.1 }
    ]
  },
  'floette': {
    usage: 0.15, rank: 26,
    moves: { 'fairy': 0.97, 'fire': 0.72, 'psychic': 0.51 },
    moveNames: [
      { name: 'ムーンフォース', rate: 96.6 },
      { name: 'マジカルフレイム', rate: 72.3 },
      { name: 'サイコキネシス', rate: 51.4 },
      { name: 'めいそう', rate: 47.9 },
      { name: 'つきのひかり', rate: 39.3 }
    ],
    items: [
      { name: 'フラエッテナイト', rate: 96.1 }
    ]
  },
  // === 27位: メガフシギバナ ===
  'venusaur-mega': {
    usage: 0.14, rank: 27,
    moves: { 'grass': 0.93, 'poison': 0.90, 'ground': 0.42 },
    moveNames: [
      { name: 'ギガドレイン', rate: 93.1 },
      { name: 'ヘドロばくだん', rate: 89.5 },
      { name: 'じしん', rate: 42.3 },
      { name: 'やどりぎのタネ', rate: 36.7 },
      { name: 'こうごうせい', rate: 22.0 }
    ],
    items: [
      { name: 'フシギバナイト', rate: 96.5 }
    ]
  },
  'venusaur': {
    usage: 0.14, rank: 27,
    moves: { 'grass': 0.93, 'poison': 0.90, 'ground': 0.42 },
    moveNames: [
      { name: 'ギガドレイン', rate: 93.1 },
      { name: 'ヘドロばくだん', rate: 89.5 },
      { name: 'じしん', rate: 42.3 },
      { name: 'やどりぎのタネ', rate: 36.7 },
      { name: 'こうごうせい', rate: 22.0 }
    ],
    items: [
      { name: 'フシギバナイト', rate: 96.5 }
    ]
  },
  // === 28位: オオニューラ ===
  'sneasler': {
    usage: 0.13, rank: 28,
    moves: { 'fighting': 0.96, 'poison': 0.83, 'bug': 0.31 },
    moveNames: [
      { name: 'インファイト', rate: 96.3 },
      { name: 'ダストシュート', rate: 82.7 },
      { name: 'つるぎのまい', rate: 62.3 },
      { name: 'フェイント', rate: 48.2 },
      { name: 'とんぼがえり', rate: 30.9 }
    ],
    items: [
      { name: 'きあいのタスキ', rate: 56.8 },
      { name: 'いのちのたま', rate: 22.3 }
    ]
  },
  // === 29位: ウルガモス ===
  'volcarona': {
    usage: 0.12, rank: 29,
    moves: { 'fire': 0.85, 'bug': 0.68 },
    moveNames: [
      { name: 'ちょうのまい', rate: 97.8 },
      { name: 'だいもんじ', rate: 85.2 },
      { name: 'むしのさざめき', rate: 67.8 },
      { name: 'ギガドレイン', rate: 39.1 },
      { name: 'サイコキネシス', rate: 22.0 }
    ],
    items: [
      { name: 'ラムのみ', rate: 34.2 },
      { name: 'いのちのたま', rate: 24.1 },
      { name: 'たべのこし', rate: 16.5 }
    ]
  },
  // === 30位: ヒートロトム ===
  'rotom-heat': {
    usage: 0.11, rank: 30,
    moves: { 'fire': 0.96, 'electric': 0.87 },
    moveNames: [
      { name: 'オーバーヒート', rate: 95.8 },
      { name: 'ボルトチェンジ', rate: 87.0 },
      { name: 'おにび', rate: 55.3 },
      { name: '10まんボルト', rate: 44.2 },
      { name: 'トリック', rate: 22.7 }
    ],
    items: [
      { name: 'オボンのみ', rate: 38.1 },
      { name: 'こだわりスカーフ', rate: 29.2 },
      { name: 'たべのこし', rate: 14.3 }
    ]
  },
  // === 31位: メガピクシー ===
  'clefable-mega': {
    usage: 0.105, rank: 31,
    moves: { 'fairy': 0.94, 'fire': 0.72 },
    moveNames: [
      { name: 'ムーンフォース', rate: 93.8 },
      { name: 'マジカルフレイム', rate: 71.5 },
      { name: 'めいそう', rate: 65.7 },
      { name: 'つきのひかり', rate: 53.8 },
      { name: 'みがわり', rate: 22.3 }
    ],
    items: [
      { name: 'ピクシーナイト', rate: 94.8 }
    ]
  },
  'clefable': {
    usage: 0.105, rank: 31,
    moves: { 'fairy': 0.94, 'fire': 0.72 },
    moveNames: [
      { name: 'ムーンフォース', rate: 93.8 },
      { name: 'マジカルフレイム', rate: 71.5 },
      { name: 'めいそう', rate: 65.7 },
      { name: 'つきのひかり', rate: 53.8 },
      { name: 'みがわり', rate: 22.3 }
    ],
    items: [
      { name: 'ピクシーナイト', rate: 94.8 }
    ]
  },
  // === 32位: バンギラス ===
  'tyranitar': {
    usage: 0.10, rank: 32,
    moves: { 'rock': 0.89, 'dark': 0.72, 'ground': 0.56, 'fighting': 0.31 },
    moveNames: [
      { name: 'ストーンエッジ', rate: 88.7 },
      { name: 'かみくだく', rate: 72.1 },
      { name: 'じしん', rate: 55.5 },
      { name: 'ステルスロック', rate: 49.3 },
      { name: 'がんせきふうじ', rate: 31.0 }
    ],
    items: [
      { name: 'とつげきチョッキ', rate: 38.1 },
      { name: 'バンギラスナイト', rate: 21.5 },
      { name: 'きあいのタスキ', rate: 18.7 }
    ]
  },
  // === 33位: メガスターミー ===
  'starmie-mega': {
    usage: 0.095, rank: 33,
    moves: { 'water': 0.90, 'psychic': 0.82, 'ice': 0.60, 'electric': 0.43 },
    moveNames: [
      { name: 'ハイドロポンプ', rate: 90.3 },
      { name: 'サイコキネシス', rate: 81.5 },
      { name: 'れいとうビーム', rate: 60.2 },
      { name: '10まんボルト', rate: 42.9 },
      { name: 'じこさいせい', rate: 30.2 }
    ],
    items: [
      { name: 'スターミーナイト', rate: 95.1 }
    ]
  },
  'starmie': {
    usage: 0.095, rank: 33,
    moves: { 'water': 0.90, 'psychic': 0.82, 'ice': 0.60, 'electric': 0.43 },
    moveNames: [
      { name: 'ハイドロポンプ', rate: 90.3 },
      { name: 'サイコキネシス', rate: 81.5 },
      { name: 'れいとうビーム', rate: 60.2 },
      { name: '10まんボルト', rate: 42.9 },
      { name: 'じこさいせい', rate: 30.2 }
    ],
    items: [
      { name: 'スターミーナイト', rate: 95.1 }
    ]
  },
  // === 34位: ドラパルト ===
  'dragapult': {
    usage: 0.09, rank: 34,
    moves: { 'dragon': 0.87, 'ghost': 0.83, 'fire': 0.47, 'electric': 0.36 },
    moveNames: [
      { name: 'りゅうせいぐん', rate: 87.2 },
      { name: 'シャドーボール', rate: 82.6 },
      { name: 'だいもんじ', rate: 47.1 },
      { name: '10まんボルト', rate: 35.9 },
      { name: 'りゅうのまい', rate: 28.7 }
    ],
    items: [
      { name: 'こだわりスカーフ', rate: 28.8 },
      { name: 'いのちのたま', rate: 23.7 },
      { name: 'きあいのタスキ', rate: 18.0 }
    ]
  },
  // === 35位: ニンフィア ===
  'sylveon': {
    usage: 0.085, rank: 35,
    moves: { 'fairy': 0.96, 'fire': 0.73 },
    moveNames: [
      { name: 'ハイパーボイス', rate: 96.3 },
      { name: 'マジカルフレイム', rate: 72.8 },
      { name: 'あくび', rate: 55.1 },
      { name: 'ねがいごと', rate: 42.0 },
      { name: 'まもる', rate: 20.0 }
    ],
    items: [
      { name: 'たべのこし', rate: 42.5 },
      { name: 'こだわりメガネ', rate: 28.1 },
      { name: 'オボンのみ', rate: 15.7 }
    ]
  },
  // === 36位: ドヒドイデ ===
  'toxapex': {
    usage: 0.08, rank: 36,
    moves: { 'poison': 0.93, 'water': 0.58 },
    moveNames: [
      { name: 'どくどく', rate: 92.5 },
      { name: 'じこさいせい', rate: 88.3 },
      { name: 'ねっとう', rate: 57.6 },
      { name: 'トーチカ', rate: 55.2 },
      { name: 'くろいきり', rate: 18.4 }
    ],
    items: [
      { name: 'くろいヘドロ', rate: 72.3 },
      { name: 'ゴツゴツメット', rate: 15.8 }
    ]
  },
  // === 37位: ラウドボーン ===
  'skeledirge': {
    usage: 0.075, rank: 37,
    moves: { 'fire': 0.94, 'ghost': 0.82 },
    moveNames: [
      { name: 'フレアソング', rate: 93.7 },
      { name: 'シャドーボール', rate: 81.9 },
      { name: 'なまける', rate: 65.4 },
      { name: 'おにび', rate: 48.2 },
      { name: 'あくび', rate: 22.1 }
    ],
    items: [
      { name: 'たべのこし', rate: 52.8 },
      { name: 'オボンのみ', rate: 27.3 }
    ]
  },
  // === 38位: クエスパトラ ===
  'espathra': {
    usage: 0.07, rank: 38,
    moves: { 'psychic': 0.96 },
    moveNames: [
      { name: 'ルミナコリジョン', rate: 95.8 },
      { name: 'アシストパワー', rate: 82.1 },
      { name: 'めいそう', rate: 78.3 },
      { name: 'じこさいせい', rate: 55.7 },
      { name: 'みがわり', rate: 32.0 }
    ],
    items: [
      { name: 'たべのこし', rate: 48.2 },
      { name: 'ラムのみ', rate: 22.5 }
    ]
  },
  // === 39位: マリルリ ===
  'azumarill': {
    usage: 0.065, rank: 39,
    moves: { 'water': 0.96, 'fairy': 0.88 },
    moveNames: [
      { name: 'アクアジェット', rate: 96.1 },
      { name: 'じゃれつく', rate: 87.5 },
      { name: 'はらだいこ', rate: 78.3 },
      { name: 'アクアブレイク', rate: 55.2 }
    ],
    items: [
      { name: 'オボンのみ', rate: 58.7 },
      { name: 'チイラのみ', rate: 22.1 }
    ]
  },
  // === 40位: ペリッパー ===
  'pelipper': {
    usage: 0.06, rank: 40,
    moves: { 'water': 0.94, 'flying': 0.72, 'bug': 0.51 },
    moveNames: [
      { name: 'なみのり', rate: 93.8 },
      { name: 'ぼうふう', rate: 72.1 },
      { name: 'はねやすめ', rate: 63.5 },
      { name: 'とんぼがえり', rate: 51.2 }
    ],
    items: [
      { name: 'しめったいわ', rate: 62.4 },
      { name: 'オボンのみ', rate: 21.3 }
    ]
  },
  // === 41位: マンムー ===
  'mamoswine': {
    usage: 0.055, rank: 41,
    moves: { 'ice': 0.97, 'ground': 0.93, 'rock': 0.42 },
    moveNames: [
      { name: 'つららばり', rate: 96.8 },
      { name: 'じしん', rate: 92.5 },
      { name: 'こおりのつぶて', rate: 82.3 },
      { name: 'ステルスロック', rate: 42.1 }
    ],
    items: [
      { name: 'きあいのタスキ', rate: 63.5 },
      { name: 'こだわりハチマキ', rate: 18.7 }
    ]
  },
  // === 42位: ハラバリー ===
  'bellibolt': {
    usage: 0.05, rank: 42,
    moves: { 'electric': 0.96, 'poison': 0.42 },
    moveNames: [
      { name: 'パラボラチャージ', rate: 95.8 },
      { name: 'ボルトチェンジ', rate: 72.3 },
      { name: 'あくび', rate: 58.1 },
      { name: 'アシッドボム', rate: 42.3 }
    ],
    items: [
      { name: 'たべのこし', rate: 52.7 },
      { name: 'オボンのみ', rate: 28.4 }
    ]
  },
  // === 43位: カビゴン ===
  'snorlax': {
    usage: 0.048, rank: 43,
    moves: { 'normal': 0.91, 'ground': 0.53, 'fire': 0.32 },
    moveNames: [
      { name: 'のしかかり', rate: 91.2 },
      { name: 'じしん', rate: 52.8 },
      { name: 'ほのおのパンチ', rate: 31.5 },
      { name: 'のろい', rate: 68.3 },
      { name: 'ねむる', rate: 25.7 }
    ],
    items: [
      { name: 'たべのこし', rate: 53.2 },
      { name: 'カゴのみ', rate: 22.8 }
    ]
  },
  // === 44位: メガカメックス ===
  'blastoise-mega': {
    usage: 0.045, rank: 44,
    moves: { 'water': 0.93, 'ice': 0.72, 'dark': 0.38 },
    moveNames: [
      { name: 'しおふき', rate: 92.7 },
      { name: 'れいとうビーム', rate: 72.4 },
      { name: 'あくのはどう', rate: 38.1 },
      { name: 'からをやぶる', rate: 67.3 }
    ],
    items: [
      { name: 'カメックスナイト', rate: 96.2 }
    ]
  },
  'blastoise': {
    usage: 0.045, rank: 44,
    moves: { 'water': 0.93, 'ice': 0.72, 'dark': 0.38 },
    moveNames: [
      { name: 'しおふき', rate: 92.7 },
      { name: 'れいとうビーム', rate: 72.4 },
      { name: 'あくのはどう', rate: 38.1 },
      { name: 'からをやぶる', rate: 67.3 }
    ],
    items: [
      { name: 'カメックスナイト', rate: 96.2 }
    ]
  },
  // === 45位: ホルード ===
  'diggersby': {
    usage: 0.042, rank: 45,
    moves: { 'ground': 0.97, 'normal': 0.88, 'electric': 0.33 },
    moveNames: [
      { name: 'じしん', rate: 96.5 },
      { name: 'でんこうせっか', rate: 87.9 },
      { name: 'つるぎのまい', rate: 72.1 },
      { name: 'ワイルドボルト', rate: 32.5 }
    ],
    items: [
      { name: 'いのちのたま', rate: 42.3 },
      { name: 'こだわりハチマキ', rate: 28.5 }
    ]
  },
  // === 46位: エンペルト ===
  'empoleon': {
    usage: 0.04, rank: 46,
    moves: { 'water': 0.92, 'steel': 0.83, 'ice': 0.52, 'rock': 0.48 },
    moveNames: [
      { name: 'ハイドロポンプ', rate: 91.8 },
      { name: 'ラスターカノン', rate: 82.5 },
      { name: 'れいとうビーム', rate: 51.7 },
      { name: 'ステルスロック', rate: 47.8 }
    ],
    items: [
      { name: 'とつげきチョッキ', rate: 42.1 },
      { name: 'たべのこし', rate: 23.5 }
    ]
  },
  // === 47位: メガウツボット ===
  'victreebel-mega': {
    usage: 0.038, rank: 47,
    moves: { 'grass': 0.94, 'poison': 0.87 },
    moveNames: [
      { name: 'リーフストーム', rate: 93.5 },
      { name: 'ヘドロばくだん', rate: 86.8 },
      { name: 'ウェザーボール', rate: 58.2 },
      { name: 'こうごうせい', rate: 42.1 }
    ],
    items: [
      { name: 'ウツボットナイト', rate: 96.3 }
    ]
  },
  // === 48位: ドリュウズ ===
  'excadrill': {
    usage: 0.035, rank: 48,
    moves: { 'ground': 0.97, 'steel': 0.88, 'rock': 0.42 },
    moveNames: [
      { name: 'じしん', rate: 96.8 },
      { name: 'アイアンヘッド', rate: 87.5 },
      { name: 'つるぎのまい', rate: 72.3 },
      { name: 'がんせきふうじ', rate: 42.1 }
    ],
    items: [
      { name: 'きあいのタスキ', rate: 47.2 },
      { name: 'こだわりスカーフ', rate: 23.8 }
    ]
  },
  // === 49位: エアームド ===
  'skarmory': {
    usage: 0.033, rank: 49,
    moves: { 'fighting': 0.82, 'flying': 0.91, 'rock': 0.73 },
    moveNames: [
      { name: 'はねやすめ', rate: 91.2 },
      { name: 'ボディプレス', rate: 82.3 },
      { name: 'ステルスロック', rate: 73.1 },
      { name: 'ふきとばし', rate: 62.5 }
    ],
    items: [
      { name: 'ゴツゴツメット', rate: 63.8 },
      { name: 'たべのこし', rate: 22.1 }
    ]
  },
  // === 50位: メガユキメノコ ===
  'froslass-mega': {
    usage: 0.03, rank: 50,
    moves: { 'ice': 0.92, 'ghost': 0.88, 'rock': 0.58 },
    moveNames: [
      { name: 'ふぶき', rate: 91.5 },
      { name: 'シャドーボール', rate: 87.8 },
      { name: 'ステルスロック', rate: 58.3 },
      { name: 'みちづれ', rate: 52.7 }
    ],
    items: [
      { name: 'ユキメノコナイト', rate: 96.8 }
    ]
  },
  'froslass': {
    usage: 0.03, rank: 50,
    moves: { 'ice': 0.92, 'ghost': 0.88, 'rock': 0.58 },
    moveNames: [
      { name: 'ふぶき', rate: 91.5 },
      { name: 'シャドーボール', rate: 87.8 },
      { name: 'ステルスロック', rate: 58.3 },
      { name: 'みちづれ', rate: 52.7 }
    ],
    items: [
      { name: 'ユキメノコナイト', rate: 96.8 }
    ]
  }
};

// メガシンカリスト
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

// メガシンカのタイプオーバーライド
const MEGA_TYPE_OVERRIDES = {
  'venusaur-mega':      ['grass', 'poison'],
  'charizard-mega-x':   ['fire', 'dragon'],
  'charizard-mega-y':   ['fire', 'flying'],
  'blastoise-mega':     ['water'],
  'beedrill-mega':      ['bug', 'poison'],
  'pidgeot-mega':       ['normal', 'flying'],
  'alakazam-mega':      ['psychic'],
  'slowbro-mega':       ['water', 'psychic'],
  'gengar-mega':        ['ghost', 'poison'],
  'kangaskhan-mega':    ['normal'],
  'pinsir-mega':        ['bug', 'flying'],
  'gyarados-mega':      ['water', 'dark'],
  'aerodactyl-mega':    ['rock', 'flying'],
  'steelix-mega':       ['steel', 'ground'],
  'scizor-mega':        ['bug', 'steel'],
  'heracross-mega':     ['bug', 'fighting'],
  'houndoom-mega':      ['dark', 'fire'],
  'tyranitar-mega':     ['rock', 'dark'],
  'gardevoir-mega':     ['psychic', 'fairy'],
  'sableye-mega':       ['dark', 'ghost'],
  'aggron-mega':        ['steel'],
  'medicham-mega':      ['fighting', 'psychic'],
  'manectric-mega':     ['electric'],
  'sharpedo-mega':      ['water', 'dark'],
  'camerupt-mega':      ['fire', 'ground'],
  'altaria-mega':       ['dragon', 'fairy'],
  'banette-mega':       ['ghost'],
  'absol-mega':         ['dark'],
  'glalie-mega':        ['ice'],
  'lopunny-mega':       ['normal', 'fighting'],
  'garchomp-mega':      ['dragon', 'ground'],
  'lucario-mega':       ['fighting', 'steel'],
  'abomasnow-mega':     ['grass', 'ice'],
  'gallade-mega':       ['psychic', 'fighting'],
  'audino-mega':        ['normal', 'fairy'],
  'ampharos-mega':      ['electric', 'dragon'],
  // チャンピオンズ新メガ
  'starmie-mega':       ['water', 'psychic'],
  'dragonite-mega':     ['dragon', 'flying'],
  'meganium-mega':      ['grass', 'fairy'],
  'feraligatr-mega':    ['water', 'dragon'],
  'skarmory-mega':      ['steel', 'flying'],
  'emboar-mega':        ['fire', 'fighting'],
  'excadrill-mega':     ['ground', 'steel'],
  'chandelure-mega':    ['ghost', 'fire'],
  'golurk-mega':        ['ground', 'ghost'],
  'chesnaught-mega':    ['grass', 'fighting'],
  'delphox-mega':       ['fire', 'psychic'],
  'greninja-mega':      ['water', 'dark'],
  'floette-mega':       ['fairy'],
  'hawlucha-mega':      ['fighting', 'flying'],
  'crabominable-mega':  ['fighting', 'ice'],
  'drampa-mega':        ['normal', 'dragon'],
  'scovillain-mega':    ['grass', 'fire'],
  'glimmora-mega':      ['rock', 'poison'],
  'froslass-mega':      ['ice', 'ghost'],
  'chimecho-mega':      ['psychic', 'steel'],
  'clefable-mega':      ['fairy', 'flying'],
  'victreebel-mega':    ['grass', 'poison'],
};

const FORM_LABELS = {
  'alola': 'アローラ', 'galar': 'ガラル', 'hisui': 'ヒスイ',
  'paldea': 'パルデア', 'heat': 'ヒート', 'wash': 'ウォッシュ',
  'frost': 'フロスト', 'fan': 'スピン', 'mow': 'カット',
  'midday': 'まひる', 'midnight': 'まよなか', 'dusk': 'たそがれ',
  'male': '♂', 'female': '♀'
};

const CACHE_KEY = 'pokemon_champions_v4';
// データの組み立てロジックを変えたら必ず上げる（キャッシュ破棄用）
const CACHE_VERSION = 7;

/**
 * PokeAPIの /pokemon/{name} は、作品/形態によって「素の種名」が404になることがある。
 * その場合、ここで定義した別IDへフォールバックして取得する。
 *
 * 重要: アプリ内のIDは entry.id を維持し、API取得だけ代替IDを使う。
 */
const POKEAPI_ID_ALIASES = {
  // Gen7: ミミッキュはデフォルト形態が別IDになっていることがある
  'mimikyu': 'mimikyu-disguised',
  // Gen8: モルペコはフォルム名が必要
  'morpeko': 'morpeko-full-belly'
};

/**
 * 全ポケモンデータをロード（最適化版）
 * Step 1: 通常形態のみAPIフェッチ（日本語名はspeciesからまとめて取得）
 * Step 2: メガシンカ形態もAPIフェッチ（実種族値を反映）
 */
async function loadAllPokemon(onProgress) {
  // キャッシュチェック
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.version === CACHE_VERSION && parsed.data && parsed.data.length > 0) {
        if (onProgress) onProgress(1, 1);
        return parsed.data;
      }
    }
  } catch (e) {
    localStorage.removeItem(CACHE_KEY);
  }

  const total = CHAMPIONS_ROSTER.length + MEGA_ROSTER.length;
  let loaded = 0;

  // Step 1: 通常形態をバッチフェッチ
  const baseDataMap = {}; // id -> { types, stats, bst, sprite, speciesId, abilities }
  const jaNameMap = {};    // speciesId -> jaName
  const BATCH = 20;

  for (let i = 0; i < CHAMPIONS_ROSTER.length; i += BATCH) {
    const batch = CHAMPIONS_ROSTER.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async (entry) => {
      try {
        const primaryId = entry.id;
        const fallbackId = POKEAPI_ID_ALIASES[primaryId];

        let resp = await fetch(`https://pokeapi.co/api/v2/pokemon/${primaryId}`);
        if (!resp.ok && fallbackId) {
          resp = await fetch(`https://pokeapi.co/api/v2/pokemon/${fallbackId}`);
        }
        if (!resp.ok) return { entry, data: null };

        const data = await resp.json();
        return { entry, data };
      } catch {
        return { entry, data: null };
      }
    }));

    for (const { entry, data } of results) {
      loaded++;
      if (onProgress) onProgress(loaded, total);
      if (!data) continue;

      const types = data.types.map(t => t.type.name);
      const stats = {};
      data.stats.forEach(s => { stats[s.stat.name] = s.base_stat; });
      const bst = Object.values(stats).reduce((a, b) => a + b, 0);
      const sprite = data.sprites.front_default || data.sprites.other?.['official-artwork']?.front_default || '';
      const speciesId = data.species?.url?.match(/\/(\d+)\//)?.[1];
      const abilities = data.abilities ? data.abilities.map(a => a.ability.name) : [];

      baseDataMap[entry.id] = { types, stats, bst, sprite, speciesId, abilities };
    }
  }

  // Step 2: Species API（日本語名）をバッチフェッチ — 重複排除
  const uniqueSpeciesIds = [...new Set(
    Object.values(baseDataMap).map(d => d.speciesId).filter(Boolean)
  )];

  for (let i = 0; i < uniqueSpeciesIds.length; i += BATCH) {
    const batch = uniqueSpeciesIds.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async (sid) => {
      try {
        const resp = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${sid}`);
        if (!resp.ok) return { sid, name: null };
        const data = await resp.json();
        const ja = data.names.find(n => n.language.name === 'ja');
        return { sid, name: ja ? ja.name : null };
      } catch {
        return { sid, name: null };
      }
    }));
    for (const { sid, name } of results) {
      if (name) jaNameMap[sid] = name;
    }
  }

  // Step 3: 通常形態のデータ整形
  const allResults = [];

  for (const entry of CHAMPIONS_ROSTER) {
    const d = baseDataMap[entry.id];
    if (!d) continue;

    let jaName = entry.name;
    if (d.speciesId && jaNameMap[d.speciesId]) {
      jaName = jaNameMap[d.speciesId];
      if (entry.form) {
        jaName += `(${FORM_LABELS[entry.form] || entry.form})`;
      }
    }

    allResults.push({
      id: entry.id,
      name: entry.name,
      jaName,
      types: d.types,
      stats: d.stats,
      bst: d.bst,
      sprite: d.sprite,
      isMega: false,
      baseId: null,
      abilities: d.abilities || []
    });
  }

  // メガシンカで耐性に影響する特性への変化（ハードコード）
  const MEGA_ABILITY_OVERRIDES = {
    'venusaur-mega': ['thick-fat'],
    'charizard-mega-y': ['drought'],
    'aggron-mega': ['filter'],
    'altaria-mega': ['pixilate'] // フェアリー追加など
  };

  // Step 4: メガシンカのデータフェッチ（実種族値をPokeAPIから取得）
  for (let i = 0; i < MEGA_ROSTER.length; i += BATCH) {
    const batch = MEGA_ROSTER.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async (mega) => {
      try {
        const resp = await fetch(`https://pokeapi.co/api/v2/pokemon/${mega.id}`);
        if (!resp.ok) return { mega, data: null };
        const data = await resp.json();
        return { mega, data };
      } catch {
        return { mega, data: null };
      }
    }));

    for (const { mega, data } of results) {
      loaded++;
      if (onProgress) onProgress(loaded, total);

      const baseData = baseDataMap[mega.baseId];
      if (!baseData) continue;

      let jaName = mega.name;
      if (baseData.speciesId && jaNameMap[baseData.speciesId]) {
        jaName = 'メガ' + jaNameMap[baseData.speciesId];
        // X/Y区別
        if (mega.id.endsWith('-x')) jaName += ' X';
        if (mega.id.endsWith('-y')) jaName += ' Y';
      }

      const megaTypes = MEGA_TYPE_OVERRIDES[mega.id] || baseData.types;
      const megaAbilities = MEGA_ABILITY_OVERRIDES[mega.id] || baseData.abilities || [];

      let stats = baseData.stats;
      let bst = baseData.bst;
      let sprite = baseData.sprite;

      if (data) {
        stats = {};
        data.stats.forEach(s => { stats[s.stat.name] = s.base_stat; });
        bst = Object.values(stats).reduce((a, b) => a + b, 0);
        sprite = data.sprites.front_default || data.sprites.other?.['official-artwork']?.front_default || baseData.sprite;
      }

      allResults.push({
        id: mega.id,
        name: mega.name,
        jaName,
        types: megaTypes,
        stats,
        bst,
        sprite,
        isMega: true,
        baseId: mega.baseId,
        abilities: megaAbilities
      });
    }
  }

  // キャッシュ保存
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      version: CACHE_VERSION,
      data: allResults,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.warn('Cache save failed:', e);
  }

  return allResults;
}

function clearCache() {
  localStorage.removeItem(CACHE_KEY);
}

window.PokemonData = {
  CHAMPIONS_ROSTER,
  MEGA_ROSTER,
  loadAllPokemon,
  clearCache
};
