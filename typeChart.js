// ==========================================
// typeChart.js — タイプ相性データ
// ==========================================

// 全18タイプ（英語キー）
const TYPES = [
  'normal','fire','water','electric','grass','ice',
  'fighting','poison','ground','flying','psychic','bug',
  'rock','ghost','dragon','dark','steel','fairy'
];

// タイプ名：英語 → 日本語
const TYPE_NAMES_JA = {
  normal: 'ノーマル', fire: 'ほのお', water: 'みず', electric: 'でんき',
  grass: 'くさ', ice: 'こおり', fighting: 'かくとう', poison: 'どく',
  ground: 'じめん', flying: 'ひこう', psychic: 'エスパー', bug: 'むし',
  rock: 'いわ', ghost: 'ゴースト', dragon: 'ドラゴン', dark: 'あく',
  steel: 'はがね', fairy: 'フェアリー'
};

// タイプカラー（公式に近い配色）
const TYPE_COLORS = {
  normal:   '#A8A77A', fire:     '#EE8130', water:    '#6390F0',
  electric: '#F7D02C', grass:    '#7AC74C', ice:      '#96D9D6',
  fighting: '#C22E28', poison:   '#A33EA1', ground:   '#E2BF65',
  flying:   '#A98FF3', psychic:  '#F95587', bug:      '#A6B91A',
  rock:     '#B6A136', ghost:    '#735797', dragon:   '#6F35FC',
  dark:     '#705746', steel:    '#B7B7CE', fairy:    '#D685AD'
};

// タイプ相性表: EFFECTIVENESS[攻撃タイプ][防御タイプ] = 倍率
// 1.0（等倍）は省略し、デフォルトで1.0を返す
const EFFECTIVENESS_DATA = {
  normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
  fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying:   { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug:      { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
  dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy:    { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
};

/**
 * 攻撃タイプ → 防御タイプ の倍率を返す
 */
function getEffectiveness(atkType, defType) {
  const data = EFFECTIVENESS_DATA[atkType];
  if (!data || data[defType] === undefined) return 1.0;
  return data[defType];
}

/**
 * 攻撃タイプ → 複合タイプ（1～2タイプ）の被ダメージ倍率を返す
 * @param {string} atkType - 攻撃タイプ
 * @param {string[]} defTypes - 防御側のタイプ配列（1～2要素）
 * @returns {number} 被ダメージ倍率
 */
function getDamageMultiplier(atkType, defTypes) {
  let multiplier = 1.0;
  for (const dt of defTypes) {
    multiplier *= getEffectiveness(atkType, dt);
  }
  return multiplier;
}

/**
 * あるポケモン（タイプ配列）の全18タイプからの被ダメージ倍率ベクトルを計算
 * @param {string[]} types - ポケモンのタイプ配列
 * @returns {Object} { normal: 1.0, fire: 2.0, ... }
 */
function getDefensiveVector(types) {
  const vector = {};
  for (const atkType of TYPES) {
    vector[atkType] = getDamageMultiplier(atkType, types);
  }
  return vector;
}

/**
 * あるポケモン（タイプ配列）のタイプ一致攻撃での攻撃倍率ベクトルを計算
 * 各防御タイプに対して、自身のタイプの中で最も高い倍率を採用
 * @param {string[]} types - ポケモンのタイプ配列
 * @returns {Object} { normal: 1.0, fire: 0.5, ... }
 */
function getOffensiveVector(types) {
  const vector = {};
  for (const defType of TYPES) {
    let best = 0;
    for (const atkType of types) {
      const eff = getEffectiveness(atkType, defType);
      if (eff > best) best = eff;
    }
    vector[defType] = best;
  }
  return vector;
}

// エクスポート（グローバル）
window.TypeChart = {
  TYPES,
  TYPE_NAMES_JA,
  TYPE_COLORS,
  EFFECTIVENESS_DATA,
  getEffectiveness,
  getDamageMultiplier,
  getDefensiveVector,
  getOffensiveVector
};
