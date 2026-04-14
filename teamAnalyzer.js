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

  // 1匹目（起点）の候補を評価
  const firstRanked = getRankedCandidates(initialTeam, allPokemon, mode, options, baseExcludeIds);
  
  if (firstRanked.length === 0) return []; // 候補ゼロ

  // 上位100匹を探索対象として、条件を満たすパーティを最大5パターン生成する
  const numPatternsToFind = 5;
  const patterns = [];
  const maxSearchLimit = Math.min(100, firstRanked.length);
  const foundSignatures = new Set();

  for (let i = 0; i < maxSearchLimit; i++) {
    const recommendedSet = [];
    const currentTeam = [...initialTeam];
    const currentExcludeIds = new Set(baseExcludeIds);

    // 起点を追加
    const starter = firstRanked[i].pokemon;
    const starterScore = firstRanked[i].score;
    // 後でUI表示用にスコアを持たせておく
    const starterWithScore = { ...starter, score: starterScore };
    
    recommendedSet.push(starterWithScore);
    currentTeam.push(starter);
    currentExcludeIds.add(starter.id);
    if (starter.baseId) currentExcludeIds.add(starter.baseId);

    // 残りの枠を貪欲法で埋める
    for (let slot = 1; slot < slotsToFill; slot++) {
      const nextRanked = getRankedCandidates(currentTeam, allPokemon, mode, options, currentExcludeIds);
      if (nextRanked.length > 0) {
        const best = nextRanked[0].pokemon;
        const bestScore = nextRanked[0].score;
        recommendedSet.push({ ...best, score: bestScore });
        currentTeam.push(best);
        currentExcludeIds.add(best.id);
        if (best.baseId) currentExcludeIds.add(best.baseId);
      }
    }

    // パーティ単位の総合評価（完成したパーティの防御・攻撃の全体感）
    const finalDef = analyzeDefense(currentTeam);
    const finalOff = analyzeOffense(currentTeam);
    
    // 条件を満たすかチェック
    let meetsCondition = true;
    if (options.maxWeakness !== null && options.maxWeakness !== undefined) {
      if (finalDef.penaltySum < options.maxWeakness) meetsCondition = false;
    }
    if (options.maxUncovered !== null && options.maxUncovered !== undefined) {
      if (finalOff.notEffective.length > options.maxUncovered) meetsCondition = false;
    }

    if (options.statRequirements && options.statRequirements.length > 0) {
      for (const req of options.statRequirements) {
        const hasStat = currentTeam.some(p => p.stats && p.stats[req.type] >= req.val);
        if (!hasStat) {
          meetsCondition = false;
          break;
        }
      }
    }
    
    if (options.requiredTypes && options.requiredTypes.length > 0) {
      const allTypesInTeam = new Set();
      currentTeam.forEach(p => p.types.forEach(t => allTypesInTeam.add(t)));
      const hasAllRequired = options.requiredTypes.every(reqT => allTypesInTeam.has(reqT));
      if (!hasAllRequired) meetsCondition = false;
    }

    if (meetsCondition) {
      // 追加されるメンバーのタイプ組み合わせ＋耐性特性でシグネチャを作成し、重複する組み合わせを排除する
      const addedSig = recommendedSet.map(p => getPokemonTypeSignature(p)).sort().join('|');
      if (!foundSignatures.has(addedSig)) {
        foundSignatures.add(addedSig);
        
        // 「重たい相手」の数を算出して評価に組み込む
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

          // [攻撃面] 個として処理できるメンバーがいるか
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

          // [防御面] 半減以下で受けつつ等倍以上の打点を持つメンバーがいるか
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
        // 脅威数がフィルター上限を超えていたらスキップ
        if (options.maxAtkThreats !== null && options.maxAtkThreats !== undefined && atkThreats > options.maxAtkThreats) {
          // 条件を満たさないがパターン自体は記録しない
        } else if (options.maxDefThreats !== null && options.maxDefThreats !== undefined && defThreats > options.maxDefThreats) {
          // 条件を満たさない
        } else {
          patterns.push({
            members: recommendedSet,
            teamAnalysis: { defense: finalDef, offense: finalOff },
            threatCount: { attack: atkThreats, defense: defThreats, total: atkThreats + defThreats }
          });
        }
        if (patterns.length >= numPatternsToFind) break; // 十分集まったら終了
      }
    }
  }

  // 脅威が少ない順にソートし、上位5件に絞る
  patterns.sort((a, b) => a.threatCount.total - b.threatCount.total);
  const topPatterns = patterns.slice(0, numPatternsToFind);

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
