// ==========================================
// teamAnalyzer.js — チーム分析・補完提案エンジン（ポイント相殺＆フィルター＆3候補版）
// ==========================================

// 評価モードの重み設定
const EVAL_MODES = {
  defense:  { defense: 0.8, offense: 0.2, label: '防御重視' },
  offense:  { defense: 0.2, offense: 0.8, label: '攻撃重視' },
  balanced: { defense: 0.5, offense: 0.5, label: 'バランス' }
};

/**
 * 倍率をポイントに変換する
 * 無効: +3, 1/4: +2, 1/2: +1, 等倍: 0, 2倍: -1, 4倍: -2
 */
function multiplierToPoint(multiplier) {
  if (multiplier === 0) return 3;
  if (multiplier === 0.25) return 2;
  if (multiplier === 0.5) return 1;
  if (multiplier === 1) return 0;
  if (multiplier === 2) return -1;
  if (multiplier === 4) return -2;
  if (multiplier === 4) return -2;
  return 0;
}

/**
 * 特性による耐性変化定義（上書き）
 * 無効: 0, 半減: 0.5
 */
const IMMUNITY_ABILITIES = {
  // 無効化
  'levitate': { ground: 0 },
  'earth-eater': { ground: 0 },
  'flash-fire': { fire: 0 },
  'well-baked-body': { fire: 0 },
  'water-absorb': { water: 0 },
  'dry-skin': { water: 0 },
  'storm-drain': { water: 0 },
  'volt-absorb': { electric: 0 },
  'lightning-rod': { electric: 0 },
  'motor-drive': { electric: 0 },
  'sap-sipper': { grass: 0 },
  'immunity': { poison: 0 },
  // 半減化
  'thick-fat': { fire: 0.5, ice: 0.5 },
  'heatproof': { fire: 0.5 },
  'water-bubble': { fire: 0.5 }
};

/**
 * 種族の「防御的タイプの同一性」を判定するためのシグネチャ文字列を作る
 * 単純なタイプだけでなく、耐性に直接関わる特性も考慮する
 */
function getPokemonTypeSignature(pokemon) {
  const typesStr = [...pokemon.types].sort().join('-');
  const relevantAbilities = [];
  if (pokemon.abilities) {
    pokemon.abilities.forEach(ab => {
      if (IMMUNITY_ABILITIES[ab]) relevantAbilities.push(ab);
    });
  }
  if (relevantAbilities.length > 0) {
    return typesStr + '(' + relevantAbilities.sort().join(',') + ')';
  }
  return typesStr;
}

/**
 * パーティの防御相性分析（ポイント相殺方式）
 * @param {Object[]} team
 * @returns {Object}
 */
function analyzeDefense(team) {
  const TC = window.TypeChart;
  if (team.length === 0) {
    return { totalPoints: {}, weaknesses: TC.TYPES.slice(), resistances: [], immunities: [], penaltySum: -18 };
  }

  const memberVectors = team.map(p => {
    const vec = { ...TC.getDefensiveVector(p.types) }; // コピーして上書き可能に
    if (p.abilities && p.abilities.length > 0) {
      for (const ability of p.abilities) {
        const overrides = IMMUNITY_ABILITIES[ability];
        if (overrides) {
          for (const [type, newVal] of Object.entries(overrides)) {
            // 現在の倍率よりも有利になるなら上書きする
            if (vec[type] > newVal) {
              vec[type] = newVal;
              // UI表示用にプロパティを追加
              vec._abilityModifier = p._abilityModifier || {};
              vec._abilityModifier[type] = ability; 
            }
          }
        }
      }
    }
    return vec;
  });

  const totalPoints = {};
  const weaknesses = [];   // 合計がマイナスになっている（弱点をカバーしきれていない）
  const resistances = [];  // 合計がプラス（十分カバーできている）
  
  let penaltySum = 0;

  for (const atkType of TC.TYPES) {
    let sumPt = 0;
    for (const vec of memberVectors) {
      sumPt += multiplierToPoint(vec[atkType]);
    }
    totalPoints[atkType] = sumPt;

    if (sumPt < 0) {
      weaknesses.push(atkType);
      penaltySum += sumPt; // マイナス値を加算（例: -1 が2つで -2）
    } else if (sumPt > 0) {
      resistances.push(atkType);
    }
  }

  return {
    totalPoints,
    weaknesses,
    resistances,
    penaltySum, // マイナスの合計（0に近いほど良い）
    memberVectors // UIなどでオーバーライド結果を利用できるようにエクスポート
  };
}

/**
 * パーティの攻撃カバレッジ分析（変更なし：少なくとも1匹が抜群を取れればOK）
 */
function analyzeOffense(team) {
  const TC = window.TypeChart;
  if (team.length === 0) {
    return { bestAttack: {}, superEffective: [], notEffective: [], coveredCount: 0 };
  }

  const memberVectors = team.map(p => TC.getOffensiveVector(p.types));

  const bestAttack = {};
  const superEffective = [];
  const notEffective = [];

  for (const defType of TC.TYPES) {
    let bestMultiplier = 0;
    for (const vec of memberVectors) {
      if (vec[defType] > bestMultiplier) {
        bestMultiplier = vec[defType];
      }
    }
    bestAttack[defType] = bestMultiplier;

    if (bestMultiplier >= 2) {
      superEffective.push(defType);
    } else {
      notEffective.push(defType);
    }
  }

  return {
    bestAttack,
    superEffective,
    notEffective,
    coveredCount: superEffective.length
  };
}

/**
 * 防御補完スコアを計算
 */
function calcDefenseScore(currentTeam, candidate) {
  const currentAnalysis = analyzeDefense(currentTeam);
  const newTeam = [...currentTeam, candidate];
  const newAnalysis = analyzeDefense(newTeam);

  // 弱点ペナルティの改善（マイナスがどれだけ0に近づいたか。改善するほどプラス）
  const penaltyImprov = newAnalysis.penaltySum - currentAnalysis.penaltySum; 

  // 全体ポイントの改善
  let totalImprov = 0;
  for (const type of window.TypeChart.TYPES) {
    totalImprov += (newAnalysis.totalPoints[type] - currentAnalysis.totalPoints[type]);
  }

  // ペナルティの解消をより高く評価(weight 0.7)、全体的な耐性増加も加味(weight 0.3)
  // penaltyImprov は通常 0〜3 程度（1匹追加によるマイナスの回復量）
  // totalImprov は通常 -2〜3 程度
  const weakScore = Math.max(0, penaltyImprov) / 3; 
  const improvScore = totalImprov / 6; // 正規化用概算

  return weakScore * 0.7 + improvScore * 0.3;
}

/**
 * 攻撃補完スコアを計算
 */
function calcOffenseScore(currentTeam, candidate) {
  const currentAnalysis = analyzeOffense(currentTeam);
  const newTeam = [...currentTeam, candidate];
  const newAnalysis = analyzeOffense(newTeam);

  const currentCovered = currentAnalysis.coveredCount;
  const newCovered = newAnalysis.coveredCount;
  const improvement = newCovered - currentCovered;

  let totalImprovement = 0;
  for (const type of window.TypeChart.TYPES) {
    const currentBest = currentAnalysis.bestAttack[type] || 1;
    const newBest = newAnalysis.bestAttack[type] || 1;
    if (newBest > currentBest) {
      totalImprovement += (newBest - currentBest) / 2;
    }
  }

  const coverScore = improvement / Math.max(18 - currentCovered, 1);
  const improvScore = totalImprovement / window.TypeChart.TYPES.length;

  return coverScore * 0.6 + improvScore * 0.4;
}

/**
 * 総合スコアを計算
 */
function calcTotalScore(currentTeam, candidate, mode = 'balanced') {
  const defScore = calcDefenseScore(currentTeam, candidate);
  const offScore = calcOffenseScore(currentTeam, candidate);
  const weights = EVAL_MODES[mode] || EVAL_MODES.balanced;

  return {
    total: defScore * weights.defense + offScore * weights.offense,
    defense: defScore,
    offense: offScore
  };
}

/**
 * タイプ被りチェック
 * candidateのタイプが、team内のポケモンのタイプと一つでも被っていればtrue
 */
function hasTypeOverlap(team, candidate) {
  const teamTypes = new Set();
  for (const p of team) {
    for (const t of p.types) {
      teamTypes.add(t);
    }
  }
  for (const t of candidate.types) {
    if (teamTypes.has(t)) return true;
  }
  return false;
}

/**
 * 指定されたチームに対して、次に最適な候補を全ポケモンからスコア順で返す
 */
function getRankedCandidates(team, allPokemon, mode, options, excludeIds) {
  const candidates = [];
  const currentMegaCount = team.filter(p => p.isMega).length;

  for (const candidate of allPokemon) {
    if (excludeIds.has(candidate.id)) continue;
    if (candidate.baseId && excludeIds.has(candidate.baseId)) continue;
    if (candidate.isMega && excludeIds.has(candidate.baseId)) continue;

    // フィルター: メガシンカ枠
    if (candidate.isMega && (currentMegaCount + 1 > options.maxMega)) continue;

    // フィルター: 種族値500以上
    if (options.minBst && candidate.bst < 500) continue;
    
    // フィルター: タイプ被りなし
    if (options.noOverlap && hasTypeOverlap(team, candidate)) continue;

    const score = calcTotalScore(team, candidate, mode);
    candidates.push({ pokemon: candidate, score: score });
  }

  // スコア降順にソート（同点の場合はBST順でタイブレーカー）
  candidates.sort((a, b) => {
    if (b.score.total !== a.score.total) {
      return b.score.total - a.score.total;
    }
    return (b.pokemon.bst || 0) - (a.pokemon.bst || 0);
  });
  return candidates;
}

/**
 * 複数の候補パーティ（3パターン）を提案する
 * @param {Object[]} initialTeam
 * @param {Object[]} allPokemon
 * @param {string} mode
 * @param {number} slotsToFill (通常4)
 * @param {Object} options { minBst: boolean, noOverlap: boolean, maxMega: number, excludedIds: Set }
 * @returns {Array} [[p1, p2, p3, p4], [...], [...], [...], [...]]
 */
function recommendTeam(initialTeam, allPokemon, mode = 'balanced', slotsToFill = 4, options = { minBst: false, noOverlap: false, maxMega: 6, excludedIds: new Set() }) {
  const baseExcludeIds = new Set(initialTeam.map(p => p.id));
  for (const p of initialTeam) {
    if (p.baseId) baseExcludeIds.add(p.baseId);
    baseExcludeIds.add(p.id);
  }
  
  // ユーザーが手動で除外したポケモン（ブラックリスト）をマージ
  if (options.excludedIds && options.excludedIds.size > 0) {
    for (const exId of options.excludedIds) {
      baseExcludeIds.add(exId);
      // ベースIDも弾く（通常形態を弾いたらメガも弾くため）
      const poke = allPokemon.find(p => p.id === exId);
      if (poke && poke.baseId) baseExcludeIds.add(poke.baseId);
    }
  }

  const explicitPatternPoolLimit =
    Number.isFinite(options.searchPatternPoolLimit) && options.searchPatternPoolLimit > 0
      ? Math.floor(options.searchPatternPoolLimit)
      : null;
  const signatureBestPattern = new Map();

  function computeThreatCount(currentTeam) {
    const teamDefVecs = currentTeam.map(p => {
      const vec = window.TypeChart.getDefensiveVector(p.types, 'balanced');
      if (p.abilities && p.abilities.includes('levitate')) vec['ground'] = 0;
      if (p.abilities && p.abilities.includes('sap-sipper')) vec['grass'] = 0;
      if (p.abilities && p.abilities.includes('water-absorb')) vec['water'] = 0;
      if (p.abilities && p.abilities.includes('volt-absorb')) vec['electric'] = 0;
      if (p.abilities && p.abilities.includes('flash-fire')) vec['fire'] = 0;
      return vec;
    });

    let atkThreats = 0;
    let defThreats = 0;

    allPokemon.forEach(opp => {
      const defVecOpp = window.TypeChart.getDefensiveVector(opp.types, 'balanced');
      if (opp.abilities && opp.abilities.includes('levitate')) defVecOpp['ground'] = 0;
      if (opp.abilities && opp.abilities.includes('sap-sipper')) defVecOpp['grass'] = 0;
      if (opp.abilities && opp.abilities.includes('water-absorb')) defVecOpp['water'] = 0;
      if (opp.abilities && opp.abilities.includes('volt-absorb')) defVecOpp['electric'] = 0;
      if (opp.abilities && opp.abilities.includes('flash-fire')) defVecOpp['fire'] = 0;

      let anyoneCanHandle = false;
      currentTeam.forEach((member, mIdx) => {
        let canHitSE = false;
        member.types.forEach(type => {
          if (defVecOpp[type] >= 2) canHitSE = true;
        });
        let takesSE = false;
        opp.types.forEach(oppType => {
          if (teamDefVecs[mIdx][oppType] >= 2) takesSE = true;
        });
        if (canHitSE && !takesSE) anyoneCanHandle = true;
      });
      if (!anyoneCanHandle) atkThreats++;

      let noOneCanHandle = true;
      currentTeam.forEach((member, mIdx) => {
        let canResistAny = false;
        opp.types.forEach(oppType => {
          if (teamDefVecs[mIdx][oppType] <= 0.5) canResistAny = true;
        });
        let canHitNeutral = false;
        member.types.forEach(type => {
          if (defVecOpp[type] >= 1) canHitNeutral = true;
        });
        if (canResistAny && canHitNeutral) noOneCanHandle = false;
      });
      if (noOneCanHandle) defThreats++;
    });

    return { attack: atkThreats, defense: defThreats, total: atkThreats + defThreats };
  }

  function evaluateAndStorePattern(currentTeam, recommendedSet) {
    const finalDef = analyzeDefense(currentTeam);
    const finalOff = analyzeOffense(currentTeam);

    if (options.maxWeakness !== null && options.maxWeakness !== undefined && finalDef.penaltySum < options.maxWeakness) return;
    if (options.maxUncovered !== null && options.maxUncovered !== undefined && finalOff.notEffective.length > options.maxUncovered) return;

    if (options.statRequirements && options.statRequirements.length > 0) {
      for (const req of options.statRequirements) {
        const hasStat = currentTeam.some(p => p.stats && p.stats[req.type] >= req.val);
        if (!hasStat) return;
      }
    }

    if (options.requiredTypes && options.requiredTypes.length > 0) {
      const allTypesInTeam = new Set();
      currentTeam.forEach(p => p.types.forEach(t => allTypesInTeam.add(t)));
      const hasAllRequired = options.requiredTypes.every(reqT => allTypesInTeam.has(reqT));
      if (!hasAllRequired) return;
    }

    const threatCount = computeThreatCount(currentTeam);
    if (options.maxAtkThreats !== null && options.maxAtkThreats !== undefined && threatCount.attack > options.maxAtkThreats) return;
    if (options.maxDefThreats !== null && options.maxDefThreats !== undefined && threatCount.defense > options.maxDefThreats) return;

    const addedSig = recommendedSet.map(p => p.id).sort().join('|');
    const nextPattern = {
      members: recommendedSet,
      teamAnalysis: { defense: finalDef, offense: finalOff },
      threatCount
    };

    const existingPattern = signatureBestPattern.get(addedSig);
    if (!existingPattern) {
      signatureBestPattern.set(addedSig, nextPattern);
      return;
    }

    const existingTc = existingPattern.threatCount || { attack: Infinity, defense: Infinity, total: Infinity };
    const nextTc = nextPattern.threatCount;
    const shouldReplace =
      nextTc.total < existingTc.total ||
      (nextTc.total === existingTc.total && nextTc.attack < existingTc.attack) ||
      (nextTc.total === existingTc.total && nextTc.attack === existingTc.attack && nextTc.defense < existingTc.defense) ||
      (nextTc.total === existingTc.total && nextTc.attack === existingTc.attack && nextTc.defense === existingTc.defense &&
        nextPattern.teamAnalysis.offense.notEffective.length < existingPattern.teamAnalysis.offense.notEffective.length);
    if (shouldReplace) signatureBestPattern.set(addedSig, nextPattern);
  }

  function exhaustiveSearch(startIdx, currentTeam, currentExcludeIds, recommendedSet, currentMegaCount) {
    if (explicitPatternPoolLimit && signatureBestPattern.size >= explicitPatternPoolLimit) return;

    if (recommendedSet.length === slotsToFill) {
      evaluateAndStorePattern(currentTeam, recommendedSet);
      return;
    }

    for (let i = startIdx; i < allPokemon.length; i++) {
      if (explicitPatternPoolLimit && signatureBestPattern.size >= explicitPatternPoolLimit) return;

      const candidate = allPokemon[i];
      if (currentExcludeIds.has(candidate.id)) continue;
      if (candidate.baseId && currentExcludeIds.has(candidate.baseId)) continue;
      if (candidate.isMega && currentExcludeIds.has(candidate.baseId)) continue;
      if (candidate.isMega && (currentMegaCount + 1 > options.maxMega)) continue;
      if (options.minBst && candidate.bst < 500) continue;
      if (options.noOverlap && hasTypeOverlap(currentTeam, candidate)) continue;

      const candidateScore = calcTotalScore(currentTeam, candidate, mode);
      const nextExcludeIds = new Set(currentExcludeIds);
      nextExcludeIds.add(candidate.id);
      if (candidate.baseId) nextExcludeIds.add(candidate.baseId);

      exhaustiveSearch(
        i + 1,
        [...currentTeam, candidate],
        nextExcludeIds,
        [...recommendedSet, { ...candidate, score: candidateScore }],
        currentMegaCount + (candidate.isMega ? 1 : 0)
      );
    }
  }

  if (slotsToFill <= 0) return [];
  exhaustiveSearch(0, [...initialTeam], baseExcludeIds, [], initialTeam.filter(p => p.isMega).length);

  // 脅威が少ない順にソートし、見つかったパターンを全件返す
  const patterns = Array.from(signatureBestPattern.values());
  patterns.sort((a, b) => {
    const aTc = a.threatCount || { attack: Infinity, defense: Infinity, total: Infinity };
    const bTc = b.threatCount || { attack: Infinity, defense: Infinity, total: Infinity };

    if (aTc.total !== bTc.total) return aTc.total - bTc.total;
    if (aTc.attack !== bTc.attack) return aTc.attack - bTc.attack;
    if (aTc.defense !== bTc.defense) return aTc.defense - bTc.defense;

    const aUncovered = a.teamAnalysis?.offense?.notEffective?.length ?? Infinity;
    const bUncovered = b.teamAnalysis?.offense?.notEffective?.length ?? Infinity;
    if (aUncovered !== bUncovered) return aUncovered - bUncovered;

    const aPenalty = a.teamAnalysis?.defense?.penaltySum ?? -Infinity;
    const bPenalty = b.teamAnalysis?.defense?.penaltySum ?? -Infinity;
    if (aPenalty !== bPenalty) return bPenalty - aPenalty; // 0に近い（大きい）方を優先

    const aBst = a.members.reduce((sum, m) => sum + (m.bst || 0), 0);
    const bBst = b.members.reduce((sum, m) => sum + (m.bst || 0), 0);
    return bBst - aBst;
  });
  const topPatterns = patterns;

  // 抽出されたパターンの推奨メンバーそれぞれに、同じタイプ構成を持つ代替ポケモン（Alternates）を最大15件紐付ける
  const fullTeamBaseIds = new Set(initialTeam.map(p => p.id));
  for (const p of initialTeam) { if (p.baseId) fullTeamBaseIds.add(p.baseId); }
  
  topPatterns.forEach(pat => {
    pat.members.forEach(member => {
      const targetSig = getPokemonTypeSignature(member);
      
      const alts = allPokemon.filter(p => {
        if (p.id === member.id) return false;
        if (fullTeamBaseIds.has(p.id) || fullTeamBaseIds.has(p.baseId)) return false;
        if (options.excludedIds && (options.excludedIds.has(p.id) || options.excludedIds.has(p.baseId))) return false;
        if (options.minBst && p.bst < 500) return false;
        
        return getPokemonTypeSignature(p) === targetSig;
      });
      alts.sort((a, b) => (b.bst || 0) - (a.bst || 0));
      member.alternates = alts.slice(0, 15);
    });
  });

  return topPatterns;
}

/**
 * パーティ全体のサマリーを生成
 */
function getTeamSummary(team) {
  return {
    defense: analyzeDefense(team),
    offense: analyzeOffense(team),
    size: team.length
  };
}

// 既存の倍率からポイントを得る関数も公開しておく（描画用）
window.TeamAnalyzer = {
  EVAL_MODES,
  multiplierToPoint,
  getPokemonTypeSignature,
  analyzeDefense,
  analyzeOffense,
  calcDefenseScore,
  calcOffenseScore,
  calcTotalScore,
  recommendTeam,
  getTeamSummary
};
