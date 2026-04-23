// ==========================================
// teamAnalyzer.node.js — チーム分析・補完提案エンジン（Node.js版 / Worker Thread対応）
// ブラウザ版 teamAnalyzer.js と同一ロジック + 範囲限定探索対応
// ==========================================

'use strict';

const TypeChart = require('./typeChart.node');

// 評価モードの重み設定
const EVAL_MODES = {
  defense:  { defense: 0.8, offense: 0.2, label: '防御重視' },
  offense:  { defense: 0.2, offense: 0.8, label: '攻撃重視' },
  balanced: { defense: 0.5, offense: 0.5, label: 'バランス' }
};

function multiplierToPoint(multiplier) {
  if (multiplier === 0) return 3;
  if (multiplier === 0.25) return 2;
  if (multiplier === 0.5) return 1;
  if (multiplier === 1) return 0;
  if (multiplier === 2) return -1;
  if (multiplier === 4) return -2;
  return 0;
}

const IMMUNITY_ABILITIES = {
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
  'thick-fat': { fire: 0.5, ice: 0.5 },
  'heatproof': { fire: 0.5 },
  'water-bubble': { fire: 0.5 }
};

function applyAbilityOverrides(vec, pokemon) {
  if (pokemon.abilities) {
    for (let ai = 0; ai < pokemon.abilities.length; ai++) {
      const overrides = IMMUNITY_ABILITIES[pokemon.abilities[ai]];
      if (overrides) {
        const keys = Object.keys(overrides);
        for (let ki = 0; ki < keys.length; ki++) {
          const newVal = overrides[keys[ki]];
          if (vec[keys[ki]] > newVal) vec[keys[ki]] = newVal;
        }
      }
    }
  }
  return vec;
}

function getDefVecWithAbilities(pokemon) {
  const vec = TypeChart.getDefensiveVector(pokemon.types);
  return applyAbilityOverrides(vec, pokemon);
}

function analyzeDefense(team) {
  if (team.length === 0) {
    return { totalPoints: {}, weaknesses: TypeChart.TYPES.slice(), resistances: [], immunities: [], penaltySum: -18 };
  }

  const memberVectors = team.map(p => {
    const vec = { ...TypeChart.getDefensiveVector(p.types) };
    if (p.abilities && p.abilities.length > 0) {
      for (const ability of p.abilities) {
        const overrides = IMMUNITY_ABILITIES[ability];
        if (overrides) {
          for (const [type, newVal] of Object.entries(overrides)) {
            if (vec[type] > newVal) {
              vec[type] = newVal;
            }
          }
        }
      }
    }
    return vec;
  });

  const totalPoints = {};
  const weaknesses = [];
  const resistances = [];
  let penaltySum = 0;

  for (const atkType of TypeChart.TYPES) {
    let sumPt = 0;
    for (const vec of memberVectors) {
      sumPt += multiplierToPoint(vec[atkType]);
    }
    totalPoints[atkType] = sumPt;
    if (sumPt < 0) {
      weaknesses.push(atkType);
      penaltySum += sumPt;
    } else if (sumPt > 0) {
      resistances.push(atkType);
    }
  }

  return { totalPoints, weaknesses, resistances, penaltySum, memberVectors };
}

function analyzeOffense(team) {
  if (team.length === 0) {
    return { bestAttack: {}, superEffective: [], notEffective: [], coveredCount: 0 };
  }

  const memberVectors = team.map(p => TypeChart.getOffensiveVector(p.types));
  const bestAttack = {};
  const superEffective = [];
  const notEffective = [];

  for (const defType of TypeChart.TYPES) {
    let bestMultiplier = 0;
    for (const vec of memberVectors) {
      if (vec[defType] > bestMultiplier) bestMultiplier = vec[defType];
    }
    bestAttack[defType] = bestMultiplier;
    if (bestMultiplier >= 2) superEffective.push(defType);
    else notEffective.push(defType);
  }

  return { bestAttack, superEffective, notEffective, coveredCount: superEffective.length };
}

function calcDefenseScore(currentTeam, candidate) {
  const currentAnalysis = analyzeDefense(currentTeam);
  const newAnalysis = analyzeDefense([...currentTeam, candidate]);
  const penaltyImprov = newAnalysis.penaltySum - currentAnalysis.penaltySum;
  let totalImprov = 0;
  for (const type of TypeChart.TYPES) {
    totalImprov += (newAnalysis.totalPoints[type] - currentAnalysis.totalPoints[type]);
  }
  const weakScore = Math.max(0, penaltyImprov) / 3;
  const improvScore = totalImprov / 6;
  return weakScore * 0.7 + improvScore * 0.3;
}

function calcOffenseScore(currentTeam, candidate) {
  const currentAnalysis = analyzeOffense(currentTeam);
  const newAnalysis = analyzeOffense([...currentTeam, candidate]);
  const improvement = newAnalysis.coveredCount - currentAnalysis.coveredCount;
  let totalImprovement = 0;
  for (const type of TypeChart.TYPES) {
    const currentBest = currentAnalysis.bestAttack[type] || 1;
    const newBest = newAnalysis.bestAttack[type] || 1;
    if (newBest > currentBest) totalImprovement += (newBest - currentBest) / 2;
  }
  const coverScore = improvement / Math.max(18 - currentAnalysis.coveredCount, 1);
  const improvScore = totalImprovement / TypeChart.TYPES.length;
  return coverScore * 0.6 + improvScore * 0.4;
}

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

function hasTypeOverlap(team, candidate) {
  const teamTypes = new Set();
  for (const p of team) {
    for (const t of p.types) teamTypes.add(t);
  }
  for (const t of candidate.types) {
    if (teamTypes.has(t)) return true;
  }
  return false;
}

/**
 * メイン探索関数（Node.js版 / 同期実行 / 範囲限定対応）
 * @param {Object} params
 * @param {Object[]} params.initialTeam
 * @param {Object[]} params.allPokemon
 * @param {string} params.mode
 * @param {number} params.slotsToFill
 * @param {Object} params.options
 * @param {number} [params.workerId]   - ラウンドロビン割り当て用 (Worker用)
 * @param {number} [params.numWorkers] - ラウンドロビン割り当て用 (Worker用)
 * @param {Function} [params.onProgress] - 進捗コールバック
 * @returns {Object[]} patterns
 */
function recommendTeamSync(params) {
  const {
    initialTeam, allPokemon, mode = 'balanced', slotsToFill = 4,
    options = {}, onProgress
  } = params;

  const baseExcludeIds = new Set(initialTeam.map(p => p.id));
  for (const p of initialTeam) {
    if (p.baseId) baseExcludeIds.add(p.baseId);
    baseExcludeIds.add(p.id);
  }

  if (options.excludedIds && options.excludedIds.length > 0) {
    for (const exId of options.excludedIds) {
      baseExcludeIds.add(exId);
      const poke = allPokemon.find(p => p.id === exId);
      if (poke && poke.baseId) baseExcludeIds.add(poke.baseId);
    }
  }

  const explicitPatternPoolLimit =
    Number.isFinite(options.searchPatternPoolLimit) && options.searchPatternPoolLimit > 0
      ? Math.floor(options.searchPatternPoolLimit)
      : null;
  const signatureBestPattern = new Map();
  const initialMegaCount = initialTeam.filter(p => p.isMega).length;

  const TYPES_LIST = TypeChart.TYPES;
  const typeNameToBit = {};
  for (let ti = 0; ti < TYPES_LIST.length; ti++) {
    typeNameToBit[TYPES_LIST[ti]] = 1 << ti;
  }

  let initialTeamTypeBits = 0;
  for (const p of initialTeam) {
    for (let ti = 0; ti < p.types.length; ti++) {
      const b = typeNameToBit[p.types[ti]];
      if (b) initialTeamTypeBits |= b;
    }
  }

  function countDistinctMissingRequired(typeBits) {
    if (!options.requiredTypes || options.requiredTypes.length === 0) return 0;
    let missingMask = 0;
    for (let ri = 0; ri < options.requiredTypes.length; ri++) {
      const bit = typeNameToBit[options.requiredTypes[ri]];
      if (bit && (typeBits & bit) === 0) missingMask |= bit;
    }
    let n = 0;
    for (let m = missingMask; m; m &= m - 1) n++;
    return n;
  }

  // 同タイプ集約
  const enableSameTypeGrouping = !options.minBst &&
    (!options.statRequirements || options.statRequirements.length === 0);

  function hasResistanceChangingAbility(p) {
    if (!p || !p.abilities || p.abilities.length === 0) return false;
    for (let i = 0; i < p.abilities.length; i++) {
      if (IMMUNITY_ABILITIES[p.abilities[i]]) return true;
    }
    return false;
  }

  function plainTypeGroupKey(p) {
    const typesKey = [...p.types].sort().join('-');
    return `${typesKey}#${p.isMega ? 'mega' : 'base'}`;
  }

  // searchPool 構築
  const searchPool = [];
  const searchPoolTypeMask = [];
  const repByPlainGroupKey = new Map();

  for (const candidate of allPokemon) {
    if (baseExcludeIds.has(candidate.id)) continue;
    if (candidate.baseId && baseExcludeIds.has(candidate.baseId)) continue;
    if (candidate.isMega && baseExcludeIds.has(candidate.baseId)) continue;
    if (candidate.isMega && initialMegaCount >= options.maxMega) continue;
    if (options.minBst && candidate.bst < 500) continue;
    if (options.noOverlap && hasTypeOverlap(initialTeam, candidate)) continue;

    if (enableSameTypeGrouping && !hasResistanceChangingAbility(candidate)) {
      const key = plainTypeGroupKey(candidate);
      if (!repByPlainGroupKey.has(key)) {
        repByPlainGroupKey.set(key, candidate);
        searchPool.push(candidate);
        let tm = 0;
        for (let ti = 0; ti < candidate.types.length; ti++) {
          const b = typeNameToBit[candidate.types[ti]];
          if (b) tm |= b;
        }
        searchPoolTypeMask.push(tm);
      }
      continue;
    }

    searchPool.push(candidate);
    let tm = 0;
    for (let ti = 0; ti < candidate.types.length; ti++) {
      const b = typeNameToBit[candidate.types[ti]];
      if (b) tm |= b;
    }
    searchPoolTypeMask.push(tm);
  }

  // 早期打ち切りチェック
  if (options.requiredTypes && options.requiredTypes.length > 0) {
    if (countDistinctMissingRequired(initialTeamTypeBits) > slotsToFill * 2) return { patterns: [], searchPool };
  }
  if (options.statRequirements && options.statRequirements.length > 0) {
    for (const req of options.statRequirements) {
      const satisfiedInitial = initialTeam.some(p => p.stats && p.stats[req.type] >= req.val);
      if (satisfiedInitial) continue;
      if (!searchPool.some(p => p.stats && p.stats[req.type] >= req.val)) return { patterns: [], searchPool };
    }
  }

  if (slotsToFill <= 0) return { patterns: [], searchPool };

  // キャッシュ構築
  const oppDefVecsCache = allPokemon.map(opp => getDefVecWithAbilities(opp));
  const searchPoolDefVec = searchPool.map(p => getDefVecWithAbilities(p));
  const initialTeamDefVecs = initialTeam.map(p => getDefVecWithAbilities(p));

  // 進捗
  let visitedNodes = 0;
  let leafEvaluated = 0;
  const startTimeMs = Date.now();
  let lastReportMs = 0;

  function computeThreatCount(currentTeam, teamDefVecsArg) {
    const teamLen = currentTeam.length;
    const oppLen = allPokemon.length;
    let atkThreats = 0;
    let defThreats = 0;

    for (let oi = 0; oi < oppLen; oi++) {
      const opp = allPokemon[oi];
      const defVecOpp = oppDefVecsCache[oi];
      const oppTypesLen = opp.types.length;

      let anyoneCanHandle = false;
      for (let mi = 0; mi < teamLen; mi++) {
        const member = currentTeam[mi];
        const mVec = teamDefVecsArg[mi];
        let canHitSE = false;
        for (let ti = 0; ti < member.types.length; ti++) {
          if (defVecOpp[member.types[ti]] >= 2) { canHitSE = true; break; }
        }
        if (!canHitSE) continue;
        let takesSE = false;
        for (let oti = 0; oti < oppTypesLen; oti++) {
          if (mVec[opp.types[oti]] >= 2) { takesSE = true; break; }
        }
        if (!takesSE) { anyoneCanHandle = true; break; }
      }
      if (!anyoneCanHandle) atkThreats++;

      let noOneCanHandle = true;
      for (let mi = 0; mi < teamLen; mi++) {
        const member = currentTeam[mi];
        const mVec = teamDefVecsArg[mi];
        let canResistAny = false;
        for (let oti = 0; oti < oppTypesLen; oti++) {
          if (mVec[opp.types[oti]] <= 0.5) { canResistAny = true; break; }
        }
        if (!canResistAny) continue;
        let canHitNeutral = false;
        for (let ti = 0; ti < member.types.length; ti++) {
          if (defVecOpp[member.types[ti]] >= 1) { canHitNeutral = true; break; }
        }
        if (canHitNeutral) { noOneCanHandle = false; break; }
      }
      if (noOneCanHandle) defThreats++;
    }

    return { attack: atkThreats, defense: defThreats, total: atkThreats + defThreats };
  }

  function evaluateAndStorePattern(currentTeam, recommendedSet, teamDefVecsArg) {
    if (options.requiredTypes && options.requiredTypes.length > 0) {
      let teamTypeBits = 0;
      for (let mi = 0; mi < currentTeam.length; mi++) {
        for (let ti = 0; ti < currentTeam[mi].types.length; ti++) {
          const b = typeNameToBit[currentTeam[mi].types[ti]];
          if (b) teamTypeBits |= b;
        }
      }
      for (let ri = 0; ri < options.requiredTypes.length; ri++) {
        const reqBit = typeNameToBit[options.requiredTypes[ri]];
        if (reqBit && (teamTypeBits & reqBit) === 0) return;
      }
    }

    if (options.statRequirements && options.statRequirements.length > 0) {
      for (const req of options.statRequirements) {
        let hasStat = false;
        for (let mi = 0; mi < currentTeam.length; mi++) {
          if (currentTeam[mi].stats && currentTeam[mi].stats[req.type] >= req.val) { hasStat = true; break; }
        }
        if (!hasStat) return;
      }
    }

    const finalDef = analyzeDefense(currentTeam);
    const finalOff = analyzeOffense(currentTeam);

    if (options.maxWeakness !== null && options.maxWeakness !== undefined && finalDef.penaltySum < options.maxWeakness) return;
    if (options.maxUncovered !== null && options.maxUncovered !== undefined && finalOff.notEffective.length > options.maxUncovered) return;

    const threatCount = computeThreatCount(currentTeam, teamDefVecsArg);
    if (options.maxAtkThreats !== null && options.maxAtkThreats !== undefined) {
      const fm = options.atkThreatsMode === 'eq' ? 'eq' : 'lte';
      if (fm === 'eq' ? threatCount.attack !== options.maxAtkThreats : threatCount.attack > options.maxAtkThreats) return;
    }
    if (options.maxDefThreats !== null && options.maxDefThreats !== undefined) {
      const fm = options.defThreatsMode === 'eq' ? 'eq' : 'lte';
      if (fm === 'eq' ? threatCount.defense !== options.maxDefThreats : threatCount.defense > options.maxDefThreats) return;
    }

    const addedSig = recommendedSet.map(p => p.id).sort().join('|');
    const nextPattern = {
      members: recommendedSet,
      teamAnalysis: { defense: finalDef, offense: finalOff },
      threatCount
    };

    const existing = signatureBestPattern.get(addedSig);
    if (!existing) {
      signatureBestPattern.set(addedSig, nextPattern);
      return;
    }

    const eTc = existing.threatCount || { attack: Infinity, defense: Infinity, total: Infinity };
    const nTc = nextPattern.threatCount;
    const shouldReplace =
      nTc.total < eTc.total ||
      (nTc.total === eTc.total && nTc.attack < eTc.attack) ||
      (nTc.total === eTc.total && nTc.attack === eTc.attack && nTc.defense < eTc.defense) ||
      (nTc.total === eTc.total && nTc.attack === eTc.attack && nTc.defense === eTc.defense &&
        nextPattern.teamAnalysis.offense.notEffective.length < existing.teamAnalysis.offense.notEffective.length);
    if (shouldReplace) signatureBestPattern.set(addedSig, nextPattern);
  }

  // push/pop 探索（同期版 — Node.js ではUI譲り不要）
  const mutableCurrentTeam = [...initialTeam];
  const mutableRecommendedSet = [];
  const mutableTeamDefVecs = initialTeamDefVecs.slice();
  const mutableExcludeIds = new Set(baseExcludeIds);

  // Worker用のラウンドロビン配置
  const wId = (typeof params.workerId === 'number') ? params.workerId : 0;
  const nWorkers = (typeof params.numWorkers === 'number') ? params.numWorkers : 1;

  // 正確な進捗(%)を出すための重み計算
  const N_pool = searchPool.length;
  const W4 = new Float64Array(N_pool + 1);
  const W3 = new Float64Array(N_pool + 1);
  for (let i = N_pool - 1; i >= 0; i--) {
    W4[i] = W4[i + 1] + Math.pow(N_pool - i, 4);
    W3[i] = W3[i + 1] + Math.pow(N_pool - i, 3);
  }
  
  let workerTotalWeight = 0;
  for (let i = wId; i < N_pool; i += nWorkers) {
    workerTotalWeight += Math.pow(N_pool - i, 5);
  }

  let completedFullIWeight = 0;
  let currentI = -1;
  let currentIWeight = 0;

  function exhaustiveSearch(startIdx, currentMegaCount, branchTypeBits, depth) {
    if (explicitPatternPoolLimit && signatureBestPattern.size >= explicitPatternPoolLimit) return;

    if (mutableRecommendedSet.length === slotsToFill) {
      leafEvaluated++;
      evaluateAndStorePattern(mutableCurrentTeam, mutableRecommendedSet.slice(), mutableTeamDefVecs);

      // 進捗通知（適度な頻度で）
      if (onProgress && (visitedNodes & 16383) === 0) {
        const now = Date.now();
        if (now - lastReportMs > 500) {
          lastReportMs = now;
          let currentProgressWeight = completedFullIWeight;
          if (currentI !== -1 && currentI + 1 < N_pool) {
            const totalW4 = W4[currentI + 1];
            if (totalW4 > 0) {
               const innerI = mutableRecommendedSet.length > 1 ? searchPool.indexOf(mutableRecommendedSet[1]) : currentI + 1;
               const validJ = Math.max(innerI, currentI + 1);
               let passedW4 = totalW4 - W4[validJ];
               
               // さらに一段階深く(depth=2)概算して滑らかにする
               const totalW3 = W3[validJ + 1];
               if (totalW3 > 0) {
                 const innerK = mutableRecommendedSet.length > 2 ? searchPool.indexOf(mutableRecommendedSet[2]) : validJ + 1;
                 const validK = Math.max(innerK, validJ + 1);
                 const passedW3 = totalW3 - W3[validK];
                 const currentJW4 = Math.pow(N_pool - validJ, 4);
                 passedW4 += currentJW4 * (passedW3 / totalW3);
               }
               
               currentProgressWeight += currentIWeight * (passedW4 / totalW4);
            }
          }
          let percent = workerTotalWeight > 0 ? (currentProgressWeight / workerTotalWeight) * 100 : 100;
          if (percent > 100) percent = 100;
          
          onProgress({ 
            visitedNodes, 
            leafEvaluated, 
            bestPatterns: signatureBestPattern.size,
            patterns: Array.from(signatureBestPattern.values()),
            percent,
            elapsedMs: now - startTimeMs 
          });
        }
      }
      return;
    }

    const slotsLeft = slotsToFill - mutableRecommendedSet.length;
    if (slotsLeft > 0 && options.requiredTypes && options.requiredTypes.length > 0) {
      const fullBits = initialTeamTypeBits | branchTypeBits;
      if (countDistinctMissingRequired(fullBits) > slotsLeft * 2) return;
    }

    // depth===0 のとき Worker用の振り分けを適用
    const isRoot = (depth === 0);
    const loopStart = isRoot ? wId : startIdx;
    const loopStep = isRoot ? nWorkers : 1;

    for (let i = loopStart; i < searchPool.length; i += loopStep) {
      if (isRoot) {
        if (currentI !== -1) completedFullIWeight += currentIWeight;
        currentI = i;
        currentIWeight = Math.pow(N_pool - i, 5);
      }

      if (explicitPatternPoolLimit && signatureBestPattern.size >= explicitPatternPoolLimit) return;
      visitedNodes++;

      const candidate = searchPool[i];
      if (mutableExcludeIds.has(candidate.id)) continue;
      if (candidate.baseId && mutableExcludeIds.has(candidate.baseId)) continue;
      if (candidate.isMega && mutableExcludeIds.has(candidate.baseId)) continue;
      if (candidate.isMega && (currentMegaCount + 1 > options.maxMega)) continue;
      const candMask = searchPoolTypeMask[i];
      if (options.noOverlap && (candMask & branchTypeBits)) continue;

      const candidateScore = calcTotalScore(mutableCurrentTeam, candidate, mode);

      const addedIds = [candidate.id];
      if (candidate.baseId) addedIds.push(candidate.baseId);
      for (let ai = 0; ai < addedIds.length; ai++) mutableExcludeIds.add(addedIds[ai]);
      mutableCurrentTeam.push(candidate);
      mutableRecommendedSet.push({ ...candidate, score: candidateScore });
      mutableTeamDefVecs.push(searchPoolDefVec[i]);

      exhaustiveSearch(
        i + 1,
        currentMegaCount + (candidate.isMega ? 1 : 0),
        branchTypeBits | candMask,
        depth + 1
      );

      mutableTeamDefVecs.pop();
      mutableRecommendedSet.pop();
      mutableCurrentTeam.pop();
      for (let ai = 0; ai < addedIds.length; ai++) mutableExcludeIds.delete(addedIds[ai]);
    }

    if (isRoot && currentI !== -1) {
      completedFullIWeight += currentIWeight;
      currentI = -1;
    }
  }

  // もし rangeStart >= rangeEnd なら探索を行わず searchPool だけ返す（メインスレッドでの事前計算用）
  if (typeof params.rangeStart === 'number' && typeof params.rangeEnd === 'number' && params.rangeStart >= params.rangeEnd) {
    return {
      patterns: [],
      searchPool,
      stats: { visitedNodes: 0, leafEvaluated: 0 }
    };
  }

  exhaustiveSearch(0, initialMegaCount, 0, 0);

  // ソート
  const patterns = Array.from(signatureBestPattern.values());
  patterns.sort((a, b) => {
    const aTc = a.threatCount || { attack: Infinity, defense: Infinity, total: Infinity };
    const bTc = b.threatCount || { attack: Infinity, defense: Infinity, total: Infinity };
    if (aTc.total !== bTc.total) return aTc.total - bTc.total;
    if (aTc.attack !== bTc.attack) return aTc.attack - bTc.attack;
    if (aTc.defense !== bTc.defense) return aTc.defense - bTc.defense;
    const aU = a.teamAnalysis?.offense?.notEffective?.length ?? Infinity;
    const bU = b.teamAnalysis?.offense?.notEffective?.length ?? Infinity;
    if (aU !== bU) return aU - bU;
    const aP = a.teamAnalysis?.defense?.penaltySum ?? -Infinity;
    const bP = b.teamAnalysis?.defense?.penaltySum ?? -Infinity;
    if (aP !== bP) return bP - aP;
    const aBst = a.members.reduce((s, m) => s + (m.bst || 0), 0);
    const bBst = b.members.reduce((s, m) => s + (m.bst || 0), 0);
    return bBst - aBst;
  });

  return {
    patterns,
    searchPool,
    stats: { visitedNodes, leafEvaluated, elapsedMs: Date.now() - startTimeMs }
  };
}

/**
 * 複数Workerの結果をマージする
 */
function mergePatternResults(resultsArray) {
  const merged = new Map();
  for (const result of resultsArray) {
    for (const pat of result.patterns) {
      const sig = pat.members.map(p => p.id).sort().join('|');
      const existing = merged.get(sig);
      if (!existing) {
        merged.set(sig, pat);
        continue;
      }
      const eTc = existing.threatCount || { attack: Infinity, defense: Infinity, total: Infinity };
      const nTc = pat.threatCount;
      const shouldReplace =
        nTc.total < eTc.total ||
        (nTc.total === eTc.total && nTc.attack < eTc.attack) ||
        (nTc.total === eTc.total && nTc.attack === eTc.attack && nTc.defense < eTc.defense);
      if (shouldReplace) merged.set(sig, pat);
    }
  }

  const patterns = Array.from(merged.values());
  patterns.sort((a, b) => {
    const aTc = a.threatCount || { attack: Infinity, defense: Infinity, total: Infinity };
    const bTc = b.threatCount || { attack: Infinity, defense: Infinity, total: Infinity };
    if (aTc.total !== bTc.total) return aTc.total - bTc.total;
    if (aTc.attack !== bTc.attack) return aTc.attack - bTc.attack;
    if (aTc.defense !== bTc.defense) return aTc.defense - bTc.defense;
    const aU = a.teamAnalysis?.offense?.notEffective?.length ?? Infinity;
    const bU = b.teamAnalysis?.offense?.notEffective?.length ?? Infinity;
    if (aU !== bU) return aU - bU;
    const aP = a.teamAnalysis?.defense?.penaltySum ?? -Infinity;
    const bP = b.teamAnalysis?.defense?.penaltySum ?? -Infinity;
    if (aP !== bP) return bP - aP;
    const aBst = a.members.reduce((s, m) => s + (m.bst || 0), 0);
    const bBst = b.members.reduce((s, m) => s + (m.bst || 0), 0);
    return bBst - aBst;
  });

  return patterns;
}

module.exports = {
  EVAL_MODES,
  IMMUNITY_ABILITIES,
  multiplierToPoint,
  analyzeDefense,
  analyzeOffense,
  calcTotalScore,
  hasTypeOverlap,
  recommendTeamSync,
  mergePatternResults,
  getDefVecWithAbilities
};
