// ==========================================
// battle.js — 選出サポートツール用ロジック
// ==========================================

(function() {
  'use strict';

  const { TYPES, TYPE_NAMES_JA, TYPE_COLORS, getDefensiveVector } = window.TypeChart;
  const { loadAllPokemon } = window.PokemonData;
  const { analyzeDefense } = window.TeamAnalyzer;

  // ===== State =====
  let allPokemon = [];
  let myTeam = [null, null, null, null, null, null];
  let oppTeam = [null, null, null, null, null, null];
  let myTeamMoves = [null, null, null, null, null, null];
  let oppTeamMoves = [null, null, null, null, null, null];
  let recentPokemonIds = [];

  // ===== DOM References =====
  const authContainer = document.getElementById('auth-container');
  const appContainer = document.getElementById('app-container');
  const authInput = document.getElementById('auth-input');
  const authSubmit = document.getElementById('auth-submit');
  const authError = document.getElementById('auth-error');

  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingProgressFill = document.getElementById('loading-progress-fill');
  const loadingText = document.getElementById('loading-text');
  
  const analysisSection = document.getElementById('battle-analysis-section');
  const myTeamContainer = document.getElementById('my-team-container');
  const oppTeamContainer = document.getElementById('opp-team-container');

  // ===== Initialize =====
  async function init() {
    console.log('[Battle] init started');
    
    // Auth Check
    if (!localStorage.getItem('pokemon_builder_authorized')) {
      setupAuth();
      return;
    }
    
    authContainer.style.display = 'none';
    appContainer.style.display = 'block';

    const storedRecents = localStorage.getItem('pokemon_builder_recents');
    if (storedRecents) {
      try { recentPokemonIds = JSON.parse(storedRecents); } catch(e){}
    }

    loadingOverlay.style.display = 'flex';
    allPokemon = await loadAllPokemon((loaded, total) => {
      const pct = Math.round((loaded / total) * 100);
      loadingProgressFill.style.width = pct + '%';
      loadingText.textContent = `ポケモンデータを読み込み中... (${loaded}/${total})`;
    });
    
    loadingOverlay.style.display = 'none';
    loadingOverlay.classList.add('hidden');

    // URLからの読み込み処理
    const urlParams = new URLSearchParams(window.location.search);
    const partyParam = urlParams.get('party');

    if (partyParam) {
      const sections = partyParam.split(',');
      sections.forEach((sec, idx) => {
        if (sec && idx < 6) {
          const parts = sec.split(':');
          const id = parts[0];
          const moves = parts[1] ? parts[1].split('-') : null;
          
          const p = allPokemon.find(poke => poke.id === id);
          if (p) {
            myTeam[idx] = p;
            myTeamMoves[idx] = moves ? moves : [...p.types];
          }
        }
      });
      // URL欄をすっきりさせるためパラメータ削除（履歴を残さない）
      window.history.replaceState({}, document.title, window.location.pathname);
    } 
    // ロードされていなければ localStorage から最新状態の記憶を復元（古い仕様互換）
    else {
      const fallbackTeam = localStorage.getItem('battle_my_team');
      const fallbackMoves = localStorage.getItem('battle_my_team_moves');
      if (fallbackTeam) {
        try {
          const ids = JSON.parse(fallbackTeam);
          const fMoves = fallbackMoves ? JSON.parse(fallbackMoves) : null;
          ids.forEach((id, idx) => {
            if (id && idx < 6) {
              const p = allPokemon.find(poke => poke.id === id);
              if (p) {
                myTeam[idx] = p;
                myTeamMoves[idx] = (fMoves && fMoves[idx]) ? fMoves[idx] : [...p.types];
              }
            }
          });
        } catch(e){}
      }
    }

    renderTeamUI('my');
    renderTeamUI('opp');
    
    refreshSavedTeamsDropdown();

    document.getElementById('select-saved-team').addEventListener('change', (e) => {
      const val = e.target.value;
      if (!val) return;
      
      if (val === 'clear_all') {
        if (confirm('本当に保存した全てのパーティを削除しますか？')) {
          localStorage.removeItem('battle_saved_teams_v1');
          refreshSavedTeamsDropdown();
          alert('すべてのパーティを消去しました。');
        }
        e.target.value = "";
        return;
      }
      
      const savedTeams = getSavedTeams();
      const target = savedTeams[parseInt(val)];
      if (target) {
        myTeam = [null, null, null, null, null, null];
        myTeamMoves = [null, null, null, null, null, null];
        target.ids.forEach((id, idx) => {
          if (id && idx < 6) {
            const p = allPokemon.find(poke => poke.id === id);
            if (p) {
              myTeam[idx] = p;
              myTeamMoves[idx] = (target.myMoves && target.myMoves[idx]) ? target.myMoves[idx] : [...p.types];
            }
          }
        });
        localStorage.setItem('battle_my_team', JSON.stringify(myTeam.map(p => p ? p.id : null))); // 直近として記憶
        localStorage.setItem('battle_my_team_moves', JSON.stringify(myTeamMoves));
        renderTeamUI('my');
        updateAnalysis();
      }
      e.target.value = ""; // 選択後にリセット
    });

    document.getElementById('btn-save-my-team').addEventListener('click', () => {
      const valid = myTeam.filter(p => p !== null);
      if (valid.length === 0) {
        alert('保存するポケモンがいません');
        return;
      }
      const name = prompt('保存するパーティの名前を入力してください', 'パーティ' + (getSavedTeams().length + 1));
      if (!name) return; // キャンセル

      const ids = myTeam.map(p => p ? p.id : null);
      saveTeam(name, ids, myTeamMoves);
      localStorage.setItem('battle_my_team', JSON.stringify(ids)); // 直近として記憶
      localStorage.setItem('battle_my_team_moves', JSON.stringify(myTeamMoves));
      refreshSavedTeamsDropdown();
      alert('「' + name + '」を保存しました！');
    });

    document.getElementById('btn-share-team').addEventListener('click', () => {
      const valid = myTeam.filter(p => p !== null);
      if (valid.length === 0) {
        alert('共有するポケモンがいません');
        return;
      }
      const idsStr = myTeam.map((p, i) => {
        if (!p) return '';
        const moves = myTeamMoves[i].join('-');
        return `${p.id}:${moves}`;
      }).join(',');
      const shareUrl = window.location.origin + window.location.pathname + '?party=' + idsStr;
      
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('📱 共有用URLをクリップボードにコピーしました！\n\nこれをLINEなどでスマホに送って開けば、一瞬でパーティデータが同期（復元）されます！');
      }).catch(err => {
        prompt('以下のURLをコピーしてスマホなどに送ってください:', shareUrl);
      });
    });

    document.getElementById('btn-clear-opp-team').addEventListener('click', () => {
      oppTeam = [null, null, null, null, null, null];
      oppTeamMoves = [null, null, null, null, null, null];
      renderTeamUI('opp');
      updateAnalysis();
    });

    updateAnalysis();
  }

  function setupAuth() {
    const checkPassword = () => {
      const pw = authInput.value.trim();
      if (pw === 'champion') {
        localStorage.setItem('pokemon_builder_authorized', 'true');
        authError.style.display = 'none';
        init();
      } else {
        authError.style.display = 'block';
      }
    };
    authSubmit.addEventListener('click', checkPassword);
    authInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') checkPassword();
    });
  }

  // ===== Save Management =====
  function getSavedTeams() {
    try {
      const data = localStorage.getItem('battle_saved_teams_v1');
      if (data) return JSON.parse(data);
    } catch(e){}
    return [];
  }

  function saveTeam(name, ids, moves) {
    const teams = getSavedTeams();
    teams.push({ name, ids, myMoves: moves });
    localStorage.setItem('battle_saved_teams_v1', JSON.stringify(teams));
  }

  function refreshSavedTeamsDropdown() {
    const select = document.getElementById('select-saved-team');
    let html = '<option value="">📂 読み込み...</option>';
    const teams = getSavedTeams();
    if (teams.length > 0) {
      html += '<optgroup label="保存したパーティ（' + teams.length + '件）">';
      teams.forEach((t, idx) => {
        html += `<option value="${idx}">${t.name}</option>`;
      });
      html += '</optgroup>';
      html += '<optgroup label="操作"><option value="clear_all">⚠️ 保存データを全消去</option></optgroup>';
    }
    select.innerHTML = html;
  }

  // ===== UI Rendering for Slots =====
  function renderTeamUI(side) {
    const container = side === 'my' ? myTeamContainer : oppTeamContainer;
    const team = side === 'my' ? myTeam : oppTeam;
    
    let html = '';
    for (let i = 0; i < 6; i++) {
        html += `
          <div class="slot" id="slot-${side}-${i}" style="margin-bottom:0;">
            <div class="search-wrapper" style="${team[i] ? 'display:none;' : ''}">
              <input type="text" class="search-input" id="search-${side}-${i}" placeholder="ポケモン名で検索" autocomplete="off">
              <div class="search-dropdown" id="dropdown-${side}-${i}"></div>
            </div>
            <div class="selected-container" id="selected-${side}-${i}" style="${team[i] ? '' : 'display:none;'} padding:8px; border:1px solid var(--border-glass); border-radius:8px; background:rgba(0,0,0,0.2); position:relative;"></div>
          </div>
        `;
    }
    container.innerHTML = html;

    for (let i = 0; i < 6; i++) {
      setupSearch(side, i);
      if (team[i]) {
        renderSelectedPokemon(side, i, team[i]);
      }
    }
  }

  function setupSearch(side, index) {
    const input = document.getElementById(`search-${side}-${index}`);
    const dropdown = document.getElementById(`dropdown-${side}-${index}`);
    const team = side === 'my' ? myTeam : oppTeam;

    const handleInput = () => {
      const query = input.value.toLowerCase().trim();
      const queryKatakana = query.replace(/[\u3041-\u3096]/g, match => String.fromCharCode(match.charCodeAt(0) + 0x60));
      
      let filtered;
      if (query.length === 0) {
        filtered = allPokemon.filter(p => !team.some(t => t && t.id === p.id)).sort((a, b) => {
          const idxA = recentPokemonIds.indexOf(a.id);
          const idxB = recentPokemonIds.indexOf(b.id);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return a.jaName.localeCompare(b.jaName, 'ja');
        }).slice(0, 50);
      } else {
        filtered = allPokemon.filter(p => !team.some(t => t && t.id === p.id)).filter(p => {
          return p.jaName.toLowerCase().includes(query) ||
                 p.jaName.toLowerCase().includes(queryKatakana) ||
                 p.name.toLowerCase().includes(query) ||
                 p.id.toLowerCase().includes(query);
        }).slice(0, 50);
      }

      renderDropdown(dropdown, filtered, side, index);
    };

    input.addEventListener('input', handleInput);
    input.addEventListener('keyup', handleInput);
    input.addEventListener('focus', handleInput);
    input.addEventListener('click', handleInput);

    document.addEventListener('click', (e) => {
      if (!e.target.closest(`#slot-${side}-${index}`)) {
        dropdown.classList.remove('active');
      }
    });
  }

  function renderDropdown(dropdown, items, side, index) {
    if (items.length === 0) {
      dropdown.innerHTML = '<div class="dropdown-item" style="justify-content:center;color:var(--text-muted);pointer-events:none;">見つかりませんでした</div>';
      dropdown.classList.add('active');
      return;
    }

    dropdown.innerHTML = items.map(p => {
      const isRecent = recentPokemonIds.includes(p.id);
      return `
      <div class="dropdown-item" data-poke-id="${p.id}">
        <img src="${p.sprite}" alt="" width="40" height="40" onerror="this.style.visibility='hidden'">
        <div class="poke-name">
          ${p.jaName} ${p.isMega ? '<span class="mega-badge">MEGA</span>' : ''}
          ${isRecent ? '<span style="font-size:0.6rem; background:var(--accent-primary); padding:2px 4px; border-radius:4px; margin-left:4px;">最近</span>' : ''}
        </div>
        <div>${p.types.map(t => createTypeBadgeHTML(t)).join('')}</div>
      </div>
    `}).join('');

    dropdown.classList.add('active');

    dropdown.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const id = item.getAttribute('data-poke-id');
        const pokemon = allPokemon.find(p => p.id === id);
        if (pokemon) {
          if (side === 'my') {
             myTeam[index] = pokemon;
             myTeamMoves[index] = [...pokemon.types];
          } else {
             oppTeam[index] = pokemon;
             oppTeamMoves[index] = [...pokemon.types];
          }
          
          // 履歴更新
          recentPokemonIds = recentPokemonIds.filter(pid => pid !== pokemon.id);
          recentPokemonIds.unshift(pokemon.id);
          if (recentPokemonIds.length > 20) recentPokemonIds.pop();
          localStorage.setItem('pokemon_builder_recents', JSON.stringify(recentPokemonIds));

          renderSelectedPokemon(side, index, pokemon);
          updateAnalysis();
        }
        dropdown.classList.remove('active');
      });
    });
  }

  function renderSelectedPokemon(side, index, pokemon) {
    const selectedDiv = document.getElementById(`selected-${side}-${index}`);
    const searchWrapper = document.getElementById(`search-${side}-${index}`).parentElement;
    
    searchWrapper.style.display = 'none';
    selectedDiv.style.display = 'flex';
    selectedDiv.style.alignItems = 'center';
    selectedDiv.style.gap = '12px';

    const vec = window.TeamAnalyzer.analyzeDefense([pokemon]).memberVectors[0];
    const weaknesses = [];
    const resistances = [];
    const immunities = [];
    
    window.TypeChart.TYPES.forEach(t => {
      if (vec[t] > 1) weaknesses.push(t);
      else if (vec[t] < 1 && vec[t] > 0) resistances.push(t);
      else if (vec[t] === 0) immunities.push(t);
    });

    let matchupHtml = '<div style="display:flex; flex-direction:column; gap:4px; margin-top:8px; padding-top:8px; border-top:1px dashed rgba(255,255,255,0.1); font-size:0.65rem;">';
    
    const moves = side === 'my' ? myTeamMoves[index] : oppTeamMoves[index];
    
    let movesHtml = `
      <div style="margin-top:8px; display:flex; align-items:center; flex-wrap:wrap; gap:4px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.05);">
        <span style="font-size:0.65rem; color:var(--text-muted); margin-right:4px;">🗡️ 搭載技:</span>
        <div style="display:flex; flex-wrap:wrap; gap:4px;">
           ${moves.map(t => `
             <div class="move-badge" data-type="${t}" style="cursor:pointer;" title="クリックで消去">
               ${createTypeBadgeHTML(t, 0.8)}
             </div>
           `).join('')}
        </div>
        ${moves.length < 4 ? `
          <select class="select-add-move" style="background:var(--bg-card); border:1px dashed var(--accent-primary); border-radius:4px; padding:2px; font-size:0.65rem; color:var(--text-primary); cursor:pointer; outline:none;">
            <option value="">＋追加</option>
            ${window.TypeChart.TYPES.map(t => `<option value="${t}">${window.TypeChart.TYPE_NAMES_JA[t]}</option>`).join('')}
          </select>
        ` : ''}
      </div>
    `;

    if (weaknesses.length > 0) {
      matchupHtml += `<div style="display:flex; align-items:flex-start; gap:4px;">
        <span style="color:var(--danger); width:32px; font-weight:bold; margin-top:2px;">弱点</span>
        <div style="flex:1; display:flex; flex-wrap:wrap; gap:2px;">${weaknesses.map(t => createTypeBadgeHTML(t, 0.6)).join('')}</div>
      </div>`;
    }
    
    if (resistances.length > 0) {
      matchupHtml += `<div style="display:flex; align-items:flex-start; gap:4px;">
        <span style="color:var(--accent-secondary); width:32px; font-weight:bold; margin-top:2px;">半減</span>
        <div style="flex:1; display:flex; flex-wrap:wrap; gap:2px;">${resistances.map(t => createTypeBadgeHTML(t, 0.6)).join('')}</div>
      </div>`;
    }
    
    if (immunities.length > 0) {
      matchupHtml += `<div style="display:flex; align-items:flex-start; gap:4px;">
        <span style="color:#aaa; width:32px; font-weight:bold; margin-top:2px;">無効</span>
        <div style="flex:1; display:flex; flex-wrap:wrap; gap:2px;">${immunities.map(t => createTypeBadgeHTML(t, 0.6)).join('')}</div>
      </div>`;
    }
    matchupHtml += '</div>';

    selectedDiv.innerHTML = `
      <div style="display:flex; gap:12px; width:100%;">
        <img src="${pokemon.sprite}" alt="" style="width:48px;height:48px;object-fit:contain;">
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <div style="font-weight:700;">${pokemon.jaName} ${pokemon.isMega ? '<span class="mega-badge">M</span>' : ''}</div>
              <div>${pokemon.types.map(t => createTypeBadgeHTML(t)).join('')}</div>
            </div>
            <button class="btn-remove" data-index="${index}" style="width:28px;height:28px;background:var(--danger);color:white;border:none;border-radius:4px;cursor:pointer;">✕</button>
          </div>
          ${matchupHtml}
          ${movesHtml}
        </div>
      </div>
    `;

    selectedDiv.querySelectorAll('.move-badge').forEach(badge => {
      badge.addEventListener('click', () => {
         const t = badge.getAttribute('data-type');
         const targetMoves = side === 'my' ? myTeamMoves[index] : oppTeamMoves[index];
         const tIdx = targetMoves.indexOf(t);
         if (tIdx > -1) {
            targetMoves.splice(tIdx, 1);
            if (targetMoves.length === 0) targetMoves.push('normal'); // 全部消した場合はノーマルを保証
            renderSelectedPokemon(side, index, pokemon);
            updateAnalysis();
         }
      });
    });

    selectedDiv.querySelector('.select-add-move')?.addEventListener('change', (e) => {
      const t = e.target.value;
      if (t) {
        const targetMoves = side === 'my' ? myTeamMoves[index] : oppTeamMoves[index];
        targetMoves.push(t);
        // unique
        const unique = Array.from(new Set(targetMoves));
        if (side === 'my') myTeamMoves[index] = unique;
        else oppTeamMoves[index] = unique;
        renderSelectedPokemon(side, index, pokemon);
        updateAnalysis();
      }
    });

    selectedDiv.querySelector('.btn-remove').addEventListener('click', () => {
      if (side === 'my') {
         myTeam[index] = null;
         myTeamMoves[index] = null;
      } else {
         oppTeam[index] = null;
         oppTeamMoves[index] = null;
      }
      selectedDiv.innerHTML = '';
      selectedDiv.style.display = 'none';
      const searchWrapper = document.getElementById(`search-${side}-${index}`).parentElement;
      searchWrapper.style.display = '';
      const input = document.getElementById(`search-${side}-${index}`);
      input.value = '';
      updateAnalysis();
    });
  }

  function createTypeBadgeHTML(type, scale = 1.0) {
    const name = TYPE_NAMES_JA[type] || type;
    const color = TYPE_COLORS[type] || '#888';
    const padding = scale < 1.0 ? '1px 4px' : '2px 8px';
    const fontSize = scale < 1.0 ? '0.55rem' : '0.65rem';
    return `<span class="type-badge" style="background:${color}; padding:${padding}; font-size:${fontSize}; line-height:1; white-space:nowrap;">${name}</span>`;
  }

  // ===== Battle Matchup Calculations =====

  // 1匹(att)が1匹(def)を攻撃したときの最大倍率を取得
  function getAttackMultiplier(attacker, attackerMoves, defender) {
    let maxMod = 0;
    const defVec = getDefensiveVector(defender.types, 'balanced');
    // 特性の耐性上書きがあれば加味（浮きたなど）
    if (defender.abilities && defender.abilities.includes('levitate')) defVec['ground'] = 0;
    if (defender.abilities && defender.abilities.includes('sap-sipper')) defVec['grass'] = 0;
    if (defender.abilities && defender.abilities.includes('water-absorb')) defVec['water'] = 0;
    if (defender.abilities && defender.abilities.includes('volt-absorb')) defVec['electric'] = 0;
    if (defender.abilities && defender.abilities.includes('flash-fire')) defVec['fire'] = 0;

    for (const type of attackerMoves) {
      if (defVec[type] !== undefined && defVec[type] > maxMod) {
        maxMod = defVec[type];
      }
    }
    return maxMod;
  }

  function updateAnalysis() {
    const myValid = myTeam.map((p, i) => ({ p, moves: myTeamMoves[i], idx: i })).filter(x => x.p !== null);
    const oppValid = oppTeam.map((p, i) => ({ p, moves: oppTeamMoves[i], idx: i })).filter(x => x.p !== null);

    if (myValid.length === 0 || oppValid.length === 0) {
      analysisSection.style.display = 'none';
      return;
    }
    analysisSection.style.display = '';

    // Calculate Matrix 6x6 (Score)
    // Score format: myPoke vs oppPoke
    // Advantage = (AttackMultiplier towards opponent > 1 ? 1 : 0) - (AttackMultiplier from opponent > 1 ? 1 : 0)
    
    let matrixHtml = `
      <table style="width:100%; border-collapse:collapse; text-align:center; font-size:0.8rem;">
        <tr>
          <th style="padding:8px; border:1px solid var(--border-glass);">自分 \\ 相手</th>
          ${oppValid.map(o => `<th style="padding:8px; border:1px solid var(--border-glass);"><img src="${o.p.sprite}" style="width:32px;"><br>${o.p.jaName}</th>`).join('')}
        </tr>
    `;

    const individualScores = new Map(); // myPoke.id -> score
    myValid.forEach(m => individualScores.set(m.p.id, 0));

    myValid.forEach(m => {
      matrixHtml += `<tr>
        <th style="padding:8px; border:1px solid var(--border-glass); text-align:left;"><img src="${m.p.sprite}" style="width:32px; vertical-align:middle;"> ${m.p.jaName}</th>`;
      
      oppValid.forEach(o => {
        const dmgOut = getAttackMultiplier(m.p, m.moves, o.p); // 僕が与える最大ダメージ倍率
        const dmgIn  = getAttackMultiplier(o.p, o.moves, m.p); // 相手が与える最大ダメージ倍率

        let cellScore = 0; // -1 to 1
        if (dmgOut >= 2 && dmgIn < 2) cellScore = 1; // 有利
        else if (dmgOut < 2 && dmgIn >= 2) cellScore = -1; // 不利
        else if (dmgOut >= 2 && dmgIn >= 2) cellScore = 0.5; // 不利ではないが、同等以上の殴り合い（互角寄り・素早さ依存）
        else cellScore = 0; // 微妙な打ち合い

        // 見た目上はポイント加算など
        let rankPoints = 0;
        if (dmgOut >= 2) rankPoints += 1;
        if (dmgIn < 2) rankPoints += 1;
        if (dmgIn >= 2) rankPoints -= 2; // 弱点突かれるのは痛い
        if (dmgOut === 0) rankPoints -= 1; // 無効化されるのは痛い
        
        individualScores.set(m.p.id, individualScores.get(m.p.id) + rankPoints);

        // セルの色分け表示
        let bgColor = 'transparent';
        let icon = '➖';
        if (cellScore === 1) { bgColor = 'rgba(9, 132, 227, 0.3)'; icon = '🔵 有利'; }
        if (cellScore === -1) { bgColor = 'rgba(225, 112, 85, 0.3)'; icon = '🔴 不利'; }
        if (cellScore === 0.5){ bgColor = 'rgba(253, 203, 110, 0.3)'; icon = '⚡ 殴合'; }

        matrixHtml += `<td style="padding:8px; border:1px solid var(--border-glass); background:${bgColor};">${icon}<br><span style="font-size:0.6rem; color:var(--text-muted);">与:×${dmgOut} / 被:×${dmgIn}</span></td>`;
      });
      matrixHtml += `</tr>`;
    });
    matrixHtml += `</table>`;

    document.getElementById('matrix-container').innerHTML = matrixHtml;

    // MVP Ranking List
    const rankedMyTeam = [...myValid].sort((a, b) => individualScores.get(b.p.id) - individualScores.get(a.p.id));
    
    document.getElementById('ranking-container').innerHTML = rankedMyTeam.map((m, rank) => {
      const score = individualScores.get(m.p.id);
      let crown = '';
      if (rank === 0) crown = '🥇';
      else if (rank === 1) crown = '🥈';
      else if (rank === 2) crown = '🥉';
      
      return `
        <div style="display:flex; align-items:center; background:rgba(255,255,255,0.05); padding:12px; border-radius:8px;">
          <div style="font-size:1.2rem; margin-right:12px; width:30px; text-align:center;">${crown || (rank+1)}</div>
          <img src="${m.p.sprite}" style="width:40px;height:40px;margin-right:12px;">
          <div style="flex:1;">
            <div style="font-weight:700;">${m.p.jaName}</div>
            <div style="font-size:0.7rem; color:var(--text-muted);">刺さりスコア: ${score > 0 ? '+'+score : score}</div>
          </div>
          <div style="width:100px;">
            <div style="height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">
              <div style="height:100%; width:${Math.max(0, Math.min(100, (score + 10) * 5))}%; background:${score >= 0 ? 'var(--accent-primary)' : 'var(--danger)'};"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Best 3 Combinations
    if (myValid.length >= 3) {
      const combos = getCombinations(myValid, 3);
      let evaluatedCombos = combos.map(combo => {
        let totalScore = 0;
        let oppCovered = new Set();
        let weaknessPains = 0;

        oppValid.forEach(o => {
          let hasAdvantage = false;
          combo.forEach(m => {
            const outDmg = getAttackMultiplier(m.p, m.moves, o.p);
            if (outDmg >= 2) hasAdvantage = true;
          });
          if (hasAdvantage) oppCovered.add(o.p.id);
          
          combo.forEach(m => {
            if (getAttackMultiplier(o.p, o.moves, m.p) >= 2) weaknessPains++;
          });
        });

        // Combination score
        // +100 for each opponent covered
        // -50 for each weakness taken
        // + Synergy among themselves? (avoiding same defensive weakness)
        const synergyDef = analyzeDefense(combo.map(c => c.p));
        const overlapPenalty = synergyDef.weaknesses.reduce((sum, t) => sum + synergyDef.totalPoints[t], 0) * 20;

        totalScore = (oppCovered.size * 100) - (weaknessPains * 30) - overlapPenalty;
        return { combo, score: totalScore, covered: oppCovered.size };
      });

      evaluatedCombos.sort((a, b) => b.score - a.score);
      const top3 = evaluatedCombos.slice(0, 3);

      document.getElementById('best-selection-container').innerHTML = top3.map((c, idx) => {
        return `
          <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:8px; padding:16px;">
            <div style="font-weight:700; color:var(--accent-secondary); margin-bottom:12px;">パターン ${idx+1} (スコア: ${c.score})</div>
            <div style="display:flex; gap:12px; align-items:center;">
              ${c.combo.map(m => `
                <div style="text-align:center; flex:1;">
                  <img src="${m.p.sprite}" style="width:60px; height:60px; filter:drop-shadow(0 4px 6px rgba(0,0,0,0.5));">
                  <div style="font-size:0.8rem; font-weight:700;">${m.p.jaName}</div>
                  <div style="font-size:0.5rem; color:var(--text-muted); margin-top:2px;">技: ${m.moves.map(t => window.TypeChart.TYPE_NAMES_JA[t] || t).join('・')}</div>
                </div>
              `).join('<div style="font-size:1.5rem; color:var(--text-muted);">+</div>')}
            </div>
            <div style="margin-top:12px; font-size:0.75rem; color:var(--text-muted); text-align:center;">
              相手の ${oppValid.length} 匹中 ${c.covered} 匹に抜群が取れる構成
            </div>
          </div>
        `;
      }).join('');
    } else {
      document.getElementById('best-selection-container').innerHTML = '<p style="font-size:0.8rem; color:var(--text-muted);">自分のパーティを3体以上選択してください。</p>';
    }
  }

  // Utility combination generator (e.g. 6 C 3 = 20)
  function getCombinations(arr, size) {
    if (size === 1) return arr.map(e => [e]);
    const combos = [];
    arr.forEach((e, i) => {
      const smallerCombos = getCombinations(arr.slice(i + 1), size - 1);
      smallerCombos.forEach(c => combos.push([e].concat(c)));
    });
    return combos;
  }

  // ===== Start =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
