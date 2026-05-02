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
async function recommendTeam(initialTeam, allPokemon, mode = 'balanced', slotsToFill = 4, options = { minBst: false, noOverlap: false, maxMega: 6, excludedIds: new Set() }) {
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

  const initialMegaCount = initialTeam.filter(p => p.isMega).length;

  const TC = window.TypeChart || {};
  const TYPES_LIST = TC.TYPES || [];
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

  /** 必須タイプのうち typeBits にまだ現れていないタイプの種類数（配列内の重複は1種類として数える） */
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

  /**
   * 同タイプ（耐性変化なし）の候補を代表1匹にまとめるモード。
   * 精度（条件一致可否）を落とさないため、以下のときだけ有効にする:
   * - BSTフィルタを使っていない（minBst=false）
   * - ステータス最低要件を使っていない（statRequirementsなし）
   *
   * ※結果の列挙をID単位で完全維持するのではなく、耐性表示目的で「同タイプ代表」で良い場合の高速化。
   */
  const enableSameTypeGrouping =
    !options.minBst &&
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
    const megaKey = p.isMega ? 'mega' : 'base';
    return `${typesKey}#${megaKey}`;
  }

  // 探索ループはこの配列のみを走査（静的に不可能な候補を除外して枝数を削減）
  const searchPool = [];
  const searchPoolTypeMask = [];
  const repByPlainGroupKey = new Map();     // key -> representative pokemon
  const typeGroupMembers = new Map();       // key -> [all pokemon with same type]

  for (const candidate of allPokemon) {
    if (baseExcludeIds.has(candidate.id)) continue;
    if (candidate.baseId && baseExcludeIds.has(candidate.baseId)) continue;
    if (candidate.isMega && baseExcludeIds.has(candidate.baseId)) continue;
    if (candidate.isMega && initialMegaCount >= options.maxMega) continue;
    if (options.minBst && candidate.bst < 500) continue;
    // タイプ被りなし: 固定メンバーのタイプと被る候補はどの枝でも採れないため木から除外
    if (options.noOverlap && hasTypeOverlap(initialTeam, candidate)) continue;

    if (enableSameTypeGrouping && !hasResistanceChangingAbility(candidate)) {
      const key = plainTypeGroupKey(candidate);
      const rep = repByPlainGroupKey.get(key);
      if (!rep) {
        repByPlainGroupKey.set(key, candidate);
        typeGroupMembers.set(key, [candidate]);
        searchPool.push(candidate);
        let tm = 0;
        for (let ti = 0; ti < candidate.types.length; ti++) {
          const b = typeNameToBit[candidate.types[ti]];
          if (b) tm |= b;
        }
        searchPoolTypeMask.push(tm);
      } else {
        // 同タイプ（耐性変化なし）は代表1匹に集約（代替候補として記録）
        typeGroupMembers.get(key).push(candidate);
      }
      continue;
    }

    // 通常: そのまま探索候補へ
    searchPool.push(candidate);
    let tm = 0;
    for (let ti = 0; ti < candidate.types.length; ti++) {
      const b = typeNameToBit[candidate.types[ti]];
      if (b) tm |= b;
    }
    searchPoolTypeMask.push(tm);
  }

  // 必須タイプ: 残り枠で理論上カバーし得ない場合は探索全体を打ち切り（1匹あたりタイプは最大2つ／重複指定は1種類として数える）
  if (options.requiredTypes && options.requiredTypes.length > 0) {
    if (countDistinctMissingRequired(initialTeamTypeBits) > slotsToFill * 2) return [];
  }

  // 最低ステータス要件: 固定枠で満たせず、searchPool 内に1匹も満たす個体がいなければ打ち切り
  if (options.statRequirements && options.statRequirements.length > 0) {
    for (let si = 0; si < options.statRequirements.length; si++) {
      const req = options.statRequirements[si];
      const satisfiedInitial = initialTeam.some(p => p.stats && p.stats[req.type] >= req.val);
      if (satisfiedInitial) continue;
      const satisfiedPool = searchPool.some(p => p.stats && p.stats[req.type] >= req.val);
      if (!satisfiedPool) return [];
    }
  }

  function combinationCount(n, r) {
    if (!Number.isFinite(n) || !Number.isFinite(r) || r < 0 || n < 0 || r > n) return 0;
    if (r === 0 || r === n) return 1;
    const k = Math.min(r, n - r);
    let result = 1;
    for (let i = 1; i <= k; i++) {
      result = (result * (n - k + i)) / i;
      if (!Number.isFinite(result)) return Number.MAX_SAFE_INTEGER;
    }
    return Math.round(result);
  }

  const estimatedSearchSpace = {
    eligibleCount: searchPool.length,
    eligibleMegaCount: searchPool.filter(p => p.isMega).length,
    estimatedLeafTotal: combinationCount(searchPool.length, slotsToFill)
  };

  // ===== 【最適化1】相手ポケモンの防御ベクトルを事前キャッシュ =====
  // computeThreatCount 内で毎回 getDefensiveVector を呼んでいた処理を
  // 探索開始前に1回だけ計算してキャッシュする（特性による上書きも込み）
  const oppDefVecsCache = new Array(allPokemon.length);
  for (let oi = 0; oi < allPokemon.length; oi++) {
    const opp = allPokemon[oi];
    const vec = TC.getDefensiveVector(opp.types);
    // IMMUNITY_ABILITIES による上書きを全て適用（computeThreatCount と同一ロジック）
    if (opp.abilities) {
      for (let ai = 0; ai < opp.abilities.length; ai++) {
        const overrides = IMMUNITY_ABILITIES[opp.abilities[ai]];
        if (overrides) {
          const keys = Object.keys(overrides);
          for (let ki = 0; ki < keys.length; ki++) {
            const newVal = overrides[keys[ki]];
            if (vec[keys[ki]] > newVal) vec[keys[ki]] = newVal;
          }
        }
      }
    }
    oppDefVecsCache[oi] = vec;
  }

  // ===== 【最適化2】searchPool・initialTeam の防御ベクトルを事前キャッシュ =====
  // computeThreatCount 内のチーム側 getDefensiveVector も事前計算
  const searchPoolDefVec = new Array(searchPool.length);
  for (let si = 0; si < searchPool.length; si++) {
    const p = searchPool[si];
    const vec = TC.getDefensiveVector(p.types);
    if (p.abilities) {
      for (let ai = 0; ai < p.abilities.length; ai++) {
        const overrides = IMMUNITY_ABILITIES[p.abilities[ai]];
        if (overrides) {
          const keys = Object.keys(overrides);
          for (let ki = 0; ki < keys.length; ki++) {
            const newVal = overrides[keys[ki]];
            if (vec[keys[ki]] > newVal) vec[keys[ki]] = newVal;
          }
        }
      }
    }
    searchPoolDefVec[si] = vec;
  }

  const initialTeamDefVecs = new Array(initialTeam.length);
  for (let ii = 0; ii < initialTeam.length; ii++) {
    const p = initialTeam[ii];
    const vec = TC.getDefensiveVector(p.types);
    if (p.abilities) {
      for (let ai = 0; ai < p.abilities.length; ai++) {
        const overrides = IMMUNITY_ABILITIES[p.abilities[ai]];
        if (overrides) {
          const keys = Object.keys(overrides);
          for (let ki = 0; ki < keys.length; ki++) {
            const newVal = overrides[keys[ki]];
            if (vec[keys[ki]] > newVal) vec[keys[ki]] = newVal;
          }
        }
      }
    }
    initialTeamDefVecs[ii] = vec;
  }

  // searchPool のインデックスからキャッシュ済み防御ベクトルを引くためのMap
  const pokemonIdToSearchPoolIdx = new Map();
  for (let si = 0; si < searchPool.length; si++) {
    pokemonIdToSearchPoolIdx.set(searchPool[si].id, si);
  }

  // ===== Local progress (optional) =====
  // 同期ロジックはUIを止めやすいため、進捗表示が必要な場合のみ一定間隔でイベントループに戻す。
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
  const progressYieldMs = Number.isFinite(options.progressYieldMs) ? options.progressYieldMs : 20;
  const enableProgressYield = !!onProgress;
  const shouldCancel = typeof options.shouldCancel === 'function' ? options.shouldCancel : null;
  let searchAborted = false;
  const startTimeMs = Date.now();
  let visitedNodes = 0;   // forループ/再帰の巡回回数目安
  let leafEvaluated = 0;  // slotsToFill 到達回数
  let lastEmitMs = 0;

  async function cooperativeCancelCheck() {
    if (!shouldCancel || searchAborted) return;
    await new Promise(resolve => setTimeout(resolve, 0));
    if (shouldCancel()) searchAborted = true;
  }

  if (enableProgressYield) {
    onProgress({
      phase: 'start',
      visitedNodes,
      leafEvaluated,
      bestPatterns: signatureBestPattern.size,
      elapsedMs: 0,
      eligibleCount: estimatedSearchSpace.eligibleCount,
      estimatedLeafTotal: estimatedSearchSpace.estimatedLeafTotal,
      progressPercent: estimatedSearchSpace.estimatedLeafTotal > 0 ? 0 : null
    });
  }

  async function maybeYield() {
    if (!enableProgressYield) return;
    const now = Date.now();
    if (now - lastEmitMs < progressYieldMs) return;
    lastEmitMs = now;
    onProgress({
      phase: 'progress',
      visitedNodes,
      leafEvaluated,
      bestPatterns: signatureBestPattern.size,
      elapsedMs: now - startTimeMs,
      eligibleCount: estimatedSearchSpace.eligibleCount,
      estimatedLeafTotal: estimatedSearchSpace.estimatedLeafTotal,
      progressPercent: estimatedSearchSpace.estimatedLeafTotal > 0
        ? Math.min((leafEvaluated / estimatedSearchSpace.estimatedLeafTotal) * 100, 99.9)
        : null
    });
    // UI更新/イベント処理のために1フレーム譲る
    await new Promise(resolve => setTimeout(resolve, 0));
    if (shouldCancel && shouldCancel()) searchAborted = true;
  }

  // ===== 【最適化1+2+4】computeThreatCount: キャッシュ参照＆forループ統一 =====
  function computeThreatCount(currentTeam, teamDefVecsArg) {
    const teamLen = currentTeam.length;
    const oppLen = allPokemon.length;

    let atkThreats = 0;
    let defThreats = 0;

    for (let oi = 0; oi < oppLen; oi++) {
      const opp = allPokemon[oi];
      const defVecOpp = oppDefVecsCache[oi]; // 【最適化1】キャッシュ済み
      const oppTypesLen = opp.types.length;

      // [攻撃面]
      let anyoneCanHandle = false;
      for (let mi = 0; mi < teamLen; mi++) {
        const member = currentTeam[mi];
        const mVec = teamDefVecsArg[mi]; // 【最適化2】キャッシュ済み
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

      // [防御面]
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

  // ===== 【最適化5】evaluateAndStorePattern: フィルター順序最適化 =====
  // 軽いフィルターを先に、重い computeThreatCount を最後に
  function evaluateAndStorePattern(currentTeam, recommendedSet, teamDefVecsArg) {
    // 1. 軽いフィルター: 必須タイプチェック（ビット演算で超高速化可能だが、既にビットで簡易可能）
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

    // 2. 軽いフィルター: ステータス要件
    if (options.statRequirements && options.statRequirements.length > 0) {
      for (let si = 0; si < options.statRequirements.length; si++) {
        const req = options.statRequirements[si];
        let hasStat = false;
        for (let mi = 0; mi < currentTeam.length; mi++) {
          if (currentTeam[mi].stats && currentTeam[mi].stats[req.type] >= req.val) { hasStat = true; break; }
        }
        if (!hasStat) return;
      }
    }

    // 3. 中程度: 防御/攻撃分析
    const finalDef = analyzeDefense(currentTeam);
    const finalOff = analyzeOffense(currentTeam);

    if (options.maxWeakness !== null && options.maxWeakness !== undefined && finalDef.penaltySum < options.maxWeakness) return;
    if (options.maxUncovered !== null && options.maxUncovered !== undefined && finalOff.notEffective.length > options.maxUncovered) return;

    // 4. 最重量: 脅威カウント（キャッシュ済みベクトルを引数で受け取る）
    const threatCount = computeThreatCount(currentTeam, teamDefVecsArg);
    if (options.maxAtkThreats !== null && options.maxAtkThreats !== undefined) {
      const filterMode = options.atkThreatsMode === 'eq' ? 'eq' : 'lte';
      if (filterMode === 'eq') {
        if (threatCount.attack !== options.maxAtkThreats) return;
      } else {
        if (threatCount.attack > options.maxAtkThreats) return;
      }
    }
    if (options.maxDefThreats !== null && options.maxDefThreats !== undefined) {
      const filterMode = options.defThreatsMode === 'eq' ? 'eq' : 'lte';
      if (filterMode === 'eq') {
        if (threatCount.defense !== options.maxDefThreats) return;
      } else {
        if (threatCount.defense > options.maxDefThreats) return;
      }
    }

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

  // ===== 【最適化3】exhaustiveSearch: push/pop でメモリ割り当て削減 =====
  /**
   * @param {number} branchTypeBits 追加枠で選んだポケモンのタイプのビット和（必須タイプ枝刈り・noOverlap 時の枠内被り判定に使用）
   */
  const mutableCurrentTeam = [...initialTeam];
  const mutableRecommendedSet = [];
  const mutableTeamDefVecs = initialTeamDefVecs.slice(); // 【最適化2】チーム防御ベクトル配列を mutable に管理
  const mutableExcludeIds = new Set(baseExcludeIds); // push/pop でID管理

  async function exhaustiveSearch(startIdx, currentMegaCount, branchTypeBits) {
    if (searchAborted) return;
    if (explicitPatternPoolLimit && signatureBestPattern.size >= explicitPatternPoolLimit) return;

    if (mutableRecommendedSet.length === slotsToFill) {
      leafEvaluated++;
      if (enableProgressYield && (leafEvaluated & 1023) === 0) await maybeYield();
      if (searchAborted) return;
      // evaluateAndStorePattern にはスナップショットを渡す必要がある（members が外部に保存されるため）
      evaluateAndStorePattern(mutableCurrentTeam, mutableRecommendedSet.slice(), mutableTeamDefVecs);
      return;
    }

    const slotsLeft = slotsToFill - mutableRecommendedSet.length;
    if (slotsLeft > 0 && options.requiredTypes && options.requiredTypes.length > 0) {
      const fullBits = initialTeamTypeBits | branchTypeBits;
      if (countDistinctMissingRequired(fullBits) > slotsLeft * 2) return;
    }

    for (let i = startIdx; i < searchPool.length; i++) {
      if (searchAborted) return;
      if (explicitPatternPoolLimit && signatureBestPattern.size >= explicitPatternPoolLimit) return;
      visitedNodes++;
      if (enableProgressYield && (visitedNodes & 4095) === 0) await maybeYield();
      if (searchAborted) return;
      if (shouldCancel && (visitedNodes & 4095) === 0) await cooperativeCancelCheck();
      if (searchAborted) return;

      const candidate = searchPool[i];
      if (mutableExcludeIds.has(candidate.id)) continue;
      if (candidate.baseId && mutableExcludeIds.has(candidate.baseId)) continue;
      if (candidate.isMega && mutableExcludeIds.has(candidate.baseId)) continue;
      if (candidate.isMega && (currentMegaCount + 1 > options.maxMega)) continue;
      const candMask = searchPoolTypeMask[i];
      if (options.noOverlap) {
        if (candMask & branchTypeBits) continue;
      }

      const candidateScore = calcTotalScore(mutableCurrentTeam, candidate, mode);

      // 【最適化3】push/pop パターン: 配列/Set の複製を回避
      const addedIds = [candidate.id];
      if (candidate.baseId) addedIds.push(candidate.baseId);
      for (let ai = 0; ai < addedIds.length; ai++) mutableExcludeIds.add(addedIds[ai]);
      mutableCurrentTeam.push(candidate);
      mutableRecommendedSet.push({ ...candidate, score: candidateScore });
      mutableTeamDefVecs.push(searchPoolDefVec[i]); // 【最適化2】キャッシュ済みベクトルを追加

      await exhaustiveSearch(
        i + 1,
        currentMegaCount + (candidate.isMega ? 1 : 0),
        branchTypeBits | candMask
      );

      // pop で元に戻す
      mutableTeamDefVecs.pop();
      mutableRecommendedSet.pop();
      mutableCurrentTeam.pop();
      for (let ai = 0; ai < addedIds.length; ai++) mutableExcludeIds.delete(addedIds[ai]);

      if (searchAborted) return;
    }
  }

  if (slotsToFill <= 0) return [];
  await exhaustiveSearch(
    0,
    initialMegaCount,
    0
  );

  if (searchAborted) return [];

  if (enableProgressYield) {
    onProgress({
      phase: 'done',
      visitedNodes,
      leafEvaluated,
      bestPatterns: signatureBestPattern.size,
      elapsedMs: Date.now() - startTimeMs,
      eligibleCount: estimatedSearchSpace.eligibleCount,
      estimatedLeafTotal: estimatedSearchSpace.estimatedLeafTotal,
      progressPercent: 100
    });
  }

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

  // 同タイプ代替候補を各memberに付与
  // 同じタイプ構成の全ポケモンをalternatesとして表示する
  if (enableSameTypeGrouping) {
    for (const pat of topPatterns) {
      for (let mi = 0; mi < pat.members.length; mi++) {
        const m = pat.members[mi];
        const key = plainTypeGroupKey(m);
        const group = typeGroupMembers.get(key);
        if (group && group.length > 1) {
          pat.members[mi] = { ...m, alternates: group.filter(g => g.id !== m.id) };
        }
      }
    }
  }

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
