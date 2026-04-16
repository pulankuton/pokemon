// ==========================================
// app.js — UIロジック・イベントハンドリング（拡張版）
// ==========================================

(function() {
  'use strict';

  const { TYPES, TYPE_NAMES_JA, TYPE_COLORS, getDefensiveVector } = window.TypeChart;
  const { loadAllPokemon } = window.PokemonData;
  const { EVAL_MODES, analyzeDefense, analyzeOffense, recommendTeam, getPokemonTypeSignature } = window.TeamAnalyzer;

  // ===== State =====
  let allPokemon = [];
  let selectedPokemon = [null, null, null, null, null, null];
  let currentMode = 'balanced';
  
  // Filters
  let filterMinBst = false;
  let filterOverlap = true;
  let filterMaxMega = 6;
  let filterMaxWeakness = '0';
  let filterMaxUncovered = '0';
  let filterStatRequirements = []; // Array of { type, val }
  let filterRequiredTypes = new Set();
  let filterMaxAtkThreats = '5';
  let filterMaxDefThreats = '5';

  // 精度重視: 全探索で候補を取りこぼさない設定
  const SEARCH_PROFILE = {
    patternPoolLimit: null // null の場合は上限なし
  };

  /** VM上の Node API（Nginx /api プロキシ）を使うか */
  function useRemoteRecommendApi() {
    if (window.POKEMON_USE_LOCAL_ENGINE === true) return false;
    const p = window.location.protocol;
    return p === 'http:' || p === 'https:';
  }

  function apiUrl(action) {
    const root = typeof window.POKEMON_API_ROOT === 'string' ? window.POKEMON_API_ROOT.replace(/\/$/, '') : '';
    return `${root}/api/${action.replace(/^\//, '')}`;
  }

  function buildFilterOptions(extra = {}) {
    const maxWeaknessVal = filterMaxWeakness === 'none' ? null : parseInt(filterMaxWeakness, 10);
    const maxUncoveredVal = filterMaxUncovered === 'none' ? null : parseInt(filterMaxUncovered, 10);
    const maxAtkThreatsVal = filterMaxAtkThreats === 'none' ? null : parseInt(filterMaxAtkThreats, 10);
    const maxDefThreatsVal = filterMaxDefThreats === 'none' ? null : parseInt(filterMaxDefThreats, 10);
    const base = {
      minBst: filterMinBst,
      noOverlap: filterOverlap,
      maxMega: filterMaxMega,
      excludedIds: Array.from(excludedPokemon),
      maxWeakness: maxWeaknessVal,
      maxUncovered: maxUncoveredVal,
      statRequirements: filterStatRequirements,
      requiredTypes: Array.from(filterRequiredTypes),
      maxAtkThreats: maxAtkThreatsVal,
      maxDefThreats: maxDefThreatsVal,
      searchPatternPoolLimit: SEARCH_PROFILE.patternPoolLimit
    };
    const merged = { ...base, ...extra };
    if (merged.excludedIds instanceof Set) {
      merged.excludedIds = Array.from(merged.excludedIds);
    }
    return merged;
  }

  async function remoteRecommend(body) {
    const res = await fetch(apiUrl('recommend'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || res.statusText);
    }
    return res.json();
  }

  async function remoteCloudPerfect(excludedIds) {
    const res = await fetch(apiUrl('cloud-perfect'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ excludedIds })
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(t || res.statusText);
    }
    return res.json();
  }
  
  // Excluded List (Blacklist)
  let excludedPokemon = new Set();

  // Recent Pokemon (History)
  let recentPokemonIds = [];

  const EXCLUDED_POKEMON_STORAGE_KEY = 'pokemon_builder_excluded';

  function loadExcludedPokemon() {
    const raw = localStorage.getItem(EXCLUDED_POKEMON_STORAGE_KEY);
    if (!raw) return new Set();
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter(id => typeof id === 'string' && id.length > 0));
      }
    } catch (e) {
      console.warn('[App] failed to parse excluded pokemon:', e);
    }
    return new Set();
  }

  function saveExcludedPokemon() {
    localStorage.setItem(EXCLUDED_POKEMON_STORAGE_KEY, JSON.stringify(Array.from(excludedPokemon)));
  }

  // ===== DOM References =====
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');
  const loadingProgressFill = document.getElementById('loading-progress-fill');
  
  const analysisSection = document.getElementById('analysis-section');
  const recSection = document.getElementById('recommendations-section');
  const patternsContainer = document.getElementById('patterns-container');

  const authContainer = document.getElementById('auth-container');
  const appContainer = document.getElementById('app-container');
  const authInput = document.getElementById('auth-input');
  const authSubmit = document.getElementById('auth-submit');
  const authError = document.getElementById('auth-error');
  const runAnalysisBtn = document.getElementById('btn-run-analysis');
  const runCloudPerfectBtn = document.getElementById('btn-run-cloud-perfect-search');
  const runAnalysisHint = document.getElementById('analysis-run-hint');
  const runAnalysisIndicator = document.getElementById('analysis-running-indicator');
  const cloudPerfectStatus = document.getElementById('cloud-perfect-status');
  let analysisRunning = false;

  function setAnalysisRunning(running) {
    analysisRunning = running;
    if (runAnalysisBtn) runAnalysisBtn.disabled = running;
    if (runCloudPerfectBtn) runCloudPerfectBtn.disabled = running;
    if (runAnalysisIndicator) runAnalysisIndicator.style.display = running ? 'inline-flex' : 'none';
  }

  function markAnalysisDirty() {
    if (analysisRunning) return;
    if (runAnalysisBtn) runAnalysisBtn.classList.add('active');
    if (runAnalysisHint) runAnalysisHint.textContent = '条件が変更されました。「この条件で検索」を押すと更新されます。';
  }

  function runAnalysisNow() {
    if (analysisRunning) return;
    setAnalysisRunning(true);
    if (runAnalysisHint) runAnalysisHint.textContent = '検索中...';

    requestAnimationFrame(() => {
      setTimeout(async () => {
        try {
          await updateAnalysis();
          if (runAnalysisBtn) runAnalysisBtn.classList.remove('active');
          if (runAnalysisHint) runAnalysisHint.textContent = '最新条件で表示中';
        } finally {
          setAnalysisRunning(false);
        }
      }, 0);
    });
  }

  function runCloudPerfectSearch() {
    if (analysisRunning) return;
    setAnalysisRunning(true);
    if (runAnalysisHint) runAnalysisHint.textContent = 'Cloud全探索（完璧条件）を実行中...';
    if (cloudPerfectStatus) {
      cloudPerfectStatus.textContent = `固定条件: タイプ被りなし / メガ3枠まで / 弱点0 / 抜群未対応0 / 攻撃重たい相手0 / 防御重たい相手0 / 除外適用${excludedPokemon.size > 0 ? `（${excludedPokemon.size}匹）` : 'なし'}`;
    }

    requestAnimationFrame(() => {
      setTimeout(async () => {
        try {
          let patterns;
          if (useRemoteRecommendApi()) {
            try {
              const data = await remoteCloudPerfect(Array.from(excludedPokemon));
              patterns = data.patterns || [];
            } catch (e) {
              console.warn('[App] remote cloud-perfect failed, local fallback:', e);
              patterns = recommendTeam([], allPokemon, currentMode, 6, {
                minBst: false,
                noOverlap: true,
                maxMega: 3,
                excludedIds: new Set(excludedPokemon),
                maxWeakness: 0,
                maxUncovered: 0,
                statRequirements: [],
                requiredTypes: [],
                maxAtkThreats: 0,
                maxDefThreats: 0,
                searchPatternPoolLimit: SEARCH_PROFILE.patternPoolLimit
              });
            }
          } else {
            patterns = recommendTeam([], allPokemon, currentMode, 6, {
              minBst: false,
              noOverlap: true,
              maxMega: 3,
              excludedIds: new Set(excludedPokemon),
              maxWeakness: 0,
              maxUncovered: 0,
              statRequirements: [],
              requiredTypes: [],
              maxAtkThreats: 0,
              maxDefThreats: 0,
              searchPatternPoolLimit: SEARCH_PROFILE.patternPoolLimit
            });
          }

          analysisSection.style.display = 'none';
          recSection.style.display = '';
          renderPatterns(patterns, []);
          if (runAnalysisBtn) runAnalysisBtn.classList.remove('active');
          if (runCloudPerfectBtn) runCloudPerfectBtn.classList.remove('active');
          if (runAnalysisHint) runAnalysisHint.textContent = `Cloud全探索 完了（条件一致: ${patterns.length}件）`;
          if (cloudPerfectStatus && patterns.length === 0) {
            cloudPerfectStatus.textContent = '条件一致なし。';
          } else if (cloudPerfectStatus) {
            cloudPerfectStatus.textContent = `条件一致パーティを表示中（全${patterns.length}件）`;
          }
        } finally {
          setAnalysisRunning(false);
        }
      }, 0);
    });
  }

  // ===== Initialize =====
  async function init() {
    console.log('[App] init started');
    
    // 認証チェック
    if (!localStorage.getItem('pokemon_builder_authorized')) {
      setupAuth();
      return; // 認証が通るまで初期化を停止
    }
    
    authContainer.style.display = 'none';
    appContainer.style.display = 'block';

    try {
      const storedData = localStorage.getItem('pokemon_builder_recents');
      if (storedData) {
        try { recentPokemonIds = JSON.parse(storedData); } catch(e) {}
      }
      excludedPokemon = loadExcludedPokemon();

      loadingOverlay.style.display = 'flex';
      allPokemon = await loadAllPokemon((loaded, total) => {
        const pct = Math.round((loaded / total) * 100);
        loadingProgressFill.style.width = pct + '%';
        loadingText.textContent = `ポケモンデータを読み込み中... (${loaded}/${total})`;
      });

      console.log('[App] loaded', allPokemon.length, 'pokemon');
      
      loadingOverlay.style.display = 'none';
      loadingOverlay.classList.add('hidden');

      // Populate Required Types toggles
      const typesContainer = document.getElementById('filter-required-types-container');
      typesContainer.innerHTML = TYPES.map(t => {
        const name = TYPE_NAMES_JA[t] || t;
        const color = TYPE_COLORS[t] || '#888';
        return `<button class="type-toggle-btn" data-type="${t}" style="border-color: ${color}; color: ${color};">${name}</button>`;
      }).join('');
      
      typesContainer.querySelectorAll('.type-toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const t = e.target.getAttribute('data-type');
          if (filterRequiredTypes.has(t)) {
            filterRequiredTypes.delete(t);
            e.target.classList.remove('active');
            e.target.style.backgroundColor = 'transparent';
          } else {
            filterRequiredTypes.add(t);
            e.target.classList.add('active');
            e.target.style.backgroundColor = TYPE_COLORS[t];
          }
          markAnalysisDirty();
        });
      });

      for (let i = 1; i <= 6; i++) {
        setupSearch(i);
      }
      setupExcludeSearch();
      setupSettings();
      setupBestPairSection();
      if (runAnalysisBtn) runAnalysisBtn.addEventListener('click', runAnalysisNow);
      if (runCloudPerfectBtn) runCloudPerfectBtn.addEventListener('click', runCloudPerfectSearch);
      renderExcludedList();
      markAnalysisDirty();
      
      console.log('[App] init complete');
    } catch (err) {
      console.error('[App] init error:', err);
      loadingText.textContent = 'エラーが発生しました。ページをリロードしてください。';
    }
  }

  function setupAuth() {
    const checkPassword = () => {
      const pw = authInput.value.trim();
      if (pw === 'champion') { // ここが合言葉
        localStorage.setItem('pokemon_builder_authorized', 'true');
        authError.style.display = 'none';
        init(); // 認証成功後に再度初期化
      } else {
        authError.style.display = 'block';
      }
    };
    authSubmit.addEventListener('click', checkPassword);
    authInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') checkPassword();
    });
  }

  // ===== Search & Autocomplete =====
  function setupSearch(slotIndex) {
    const input = document.getElementById(`search-${slotIndex}`);
    const dropdown = document.getElementById(`dropdown-${slotIndex}`);

    const handleInput = () => {
      const query = input.value.toLowerCase().trim();
      const queryKatakana = query.replace(/[\u3041-\u3096]/g, match => String.fromCharCode(match.charCodeAt(0) + 0x60));
      const otherSlotIdx = slotIndex === 1 ? 1 : 0;
      const otherId = selectedPokemon[otherSlotIdx]?.id;

      let filtered;

      if (query.length === 0) {
        // 文字入力がない場合は全件を五十音順で表示、ただし最近選んだポケモンを上に表示
        filtered = allPokemon.filter(p => p.id !== otherId).sort((a, b) => {
          const idxA = recentPokemonIds.indexOf(a.id);
          const idxB = recentPokemonIds.indexOf(b.id);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB; // 最近使った順
          if (idxA !== -1) return -1; // aが最近使ったもの
          if (idxB !== -1) return 1;  // bが最近使ったもの
          return a.jaName.localeCompare(b.jaName, 'ja'); // それ以外は五十音順
        });
      } else {
        // 文字入力がある場合は絞り込み（上位50件に制限して高速化）
        filtered = allPokemon.filter(p => {
          if (p.id === otherId) return false;
          return p.jaName.toLowerCase().includes(query) ||
                 p.jaName.toLowerCase().includes(queryKatakana) ||
                 p.name.toLowerCase().includes(query) ||
                 p.id.toLowerCase().includes(query);
        }).slice(0, 50);
      }

      renderDropdown(dropdown, filtered, slotIndex);
    };

    input.addEventListener('input', handleInput);
    input.addEventListener('keyup', handleInput);
    // クリック（またはフォーカス）した瞬間に全件表示させる
    input.addEventListener('focus', handleInput);
    input.addEventListener('click', handleInput);

    document.addEventListener('click', (e) => {
      if (!e.target.closest(`#slot-${slotIndex}`)) {
        dropdown.classList.remove('active');
      }
    });
  }

  function renderDropdown(dropdown, items, slotIndex) {
    if (items.length === 0) {
      dropdown.innerHTML = '<div class="dropdown-item" style="justify-content:center;color:var(--text-muted);pointer-events:none;">見つかりませんでした</div>';
      dropdown.classList.add('active');
      return;
    }

    dropdown.innerHTML = items.map(p => {
      const isRecent = recentPokemonIds.includes(p.id);
      return `
      <div class="dropdown-item" data-poke-id="${p.id}">
        <img src="${p.sprite}" alt="" width="40" height="40" loading="lazy" onerror="this.style.visibility='hidden'">
        <div class="poke-name">
          ${p.jaName}
          ${p.isMega ? '<span class="mega-badge">MEGA</span>' : ''}
          ${isRecent ? '<span style="font-size:0.6rem; background:var(--accent-primary); color:#fff; padding:2px 4px; border-radius:4px; margin-left:4px;">最近</span>' : ''}
        </div>
        <div>${p.types.map(t => createTypeBadgeHTML(t)).join('')}</div>
      </div>
    `}).join('');

    dropdown.classList.add('active');

    const itemEls = dropdown.querySelectorAll('.dropdown-item[data-poke-id]');
    itemEls.forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const id = item.getAttribute('data-poke-id');
        const pokemon = allPokemon.find(p => p.id === id);
        if (pokemon) selectPokemon(slotIndex, pokemon);
        dropdown.classList.remove('active');
      });
    });
  }

  function setupExcludeSearch() {
    const input = document.getElementById('exclude-search');
    const dropdown = document.getElementById('exclude-dropdown');
    if (!input || !dropdown) return;

    const renderExcludeDropdown = (items) => {
      if (items.length === 0) {
        dropdown.innerHTML = '<div class="dropdown-item" style="justify-content:center;color:var(--text-muted);pointer-events:none;">候補がありません</div>';
        dropdown.classList.add('active');
        return;
      }

      dropdown.innerHTML = items.map(p => `
        <div class="dropdown-item" data-exclude-poke-id="${p.id}">
          <img src="${p.sprite}" alt="" width="40" height="40" loading="lazy" onerror="this.style.visibility='hidden'">
          <div class="poke-name">
            ${p.jaName}
            ${p.isMega ? '<span class="mega-badge">MEGA</span>' : ''}
          </div>
          <div>${p.types.map(t => createTypeBadgeHTML(t)).join('')}</div>
        </div>
      `).join('');
      dropdown.classList.add('active');

      dropdown.querySelectorAll('.dropdown-item[data-exclude-poke-id]').forEach(item => {
        item.addEventListener('mousedown', (e) => {
          e.preventDefault();
          const id = item.getAttribute('data-exclude-poke-id');
          if (!id) return;
          excludedPokemon.add(id);
          saveExcludedPokemon();
          renderExcludedList();
          markAnalysisDirty();
          input.value = '';
          dropdown.classList.remove('active');
        });
      });
    };

    const handleInput = () => {
      const query = input.value.toLowerCase().trim();
      const queryKatakana = query.replace(/[\u3041-\u3096]/g, match => String.fromCharCode(match.charCodeAt(0) + 0x60));

      let filtered = allPokemon.filter(p => !excludedPokemon.has(p.id));
      if (query.length > 0) {
        filtered = filtered.filter(p =>
          p.jaName.toLowerCase().includes(query) ||
          p.jaName.toLowerCase().includes(queryKatakana) ||
          p.name.toLowerCase().includes(query) ||
          p.id.toLowerCase().includes(query)
        );
      } else {
        filtered = filtered.sort((a, b) => a.jaName.localeCompare(b.jaName, 'ja'));
      }
      renderExcludeDropdown(filtered.slice(0, 60));
    };

    input.addEventListener('input', handleInput);
    input.addEventListener('focus', handleInput);
    input.addEventListener('click', handleInput);

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#exclude-search') && !e.target.closest('#exclude-dropdown')) {
        dropdown.classList.remove('active');
      }
    });
  }

  function selectPokemon(slotIndex, pokemon) {
    selectedPokemon[slotIndex - 1] = pokemon;

    // 履歴を更新 (最大20件)
    recentPokemonIds = recentPokemonIds.filter(id => id !== pokemon.id);
    recentPokemonIds.unshift(pokemon.id);
    if (recentPokemonIds.length > 20) recentPokemonIds.pop();
    localStorage.setItem('pokemon_builder_recents', JSON.stringify(recentPokemonIds));

    const input = document.getElementById(`search-${slotIndex}`);
    const selectedDiv = document.getElementById(`selected-${slotIndex}`);
    const slot = document.getElementById(`slot-${slotIndex}`);

    input.value = '';
    input.style.display = 'none';
    slot.classList.add('filled');

    const statKeys = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
    const statLabels = ['H', 'A', 'B', 'C', 'D', 'S'];
    const stats = pokemon.stats || {};
    
    let statsHtml = statKeys.map((k, idx) => {
      const val = stats[k] || 0;
      const pct = Math.min(val / 200 * 100, 100);
      const color = val >= 120 ? '#00b894' : val >= 80 ? 'var(--accent-secondary)' : val <= 50 ? '#e17055' : 'var(--accent-secondary)';
      return `
        <div class="stat-row" style="margin-bottom:2px;">
          <span class="stat-label" style="font-size:0.6rem;width:12px;">${statLabels[idx]}</span>
          <div class="stat-bar-track" style="height:6px;flex:1;">
            <div class="stat-bar-fill" style="width:${pct}%;background:${color};height:100%;"></div>
          </div>
          <span class="stat-value" style="font-size:0.6rem;width:20px;text-align:right;">${val}</span>
        </div>`;
    }).join('');

    selectedDiv.innerHTML = `
      <div class="selected-pokemon">
        <img src="${pokemon.sprite}" alt="${pokemon.jaName}" onerror="this.style.visibility='hidden'" style="width:64px;height:64px;object-fit:contain;">
        <div class="pokemon-info" style="flex:1; min-width:120px;">
          <div class="pokemon-name">
            ${pokemon.jaName}
            ${pokemon.isMega ? '<span class="mega-badge">MEGA</span>' : ''}
          </div>
          <div class="pokemon-name-en">${pokemon.name}</div>
          <div class="pokemon-types" style="margin-bottom:4px;">
            ${pokemon.types.map(t => createTypeBadgeHTML(t)).join('')}
          </div>
        </div>
        <div class="selected-pokemon-stats" style="flex:1.5; padding-left:12px; border-left:1px dashed rgba(255,255,255,0.1); min-width:120px;">
          ${statsHtml}
          <div class="stat-row" style="margin-top:2px;border-top:1px solid rgba(255,255,255,0.05);padding-top:2px;">
            <span class="stat-label" style="font-size:0.65rem;font-weight:700;">計</span>
            <span style="flex:1;"></span>
            <span class="stat-value" style="font-size:0.7rem;font-weight:700;color:var(--text-primary);">${pokemon.bst || 0}</span>
          </div>
        </div>
        <button class="btn-remove" data-slot="${slotIndex}" title="削除">✕</button>
      </div>
    `;

    selectedDiv.querySelector('.btn-remove').addEventListener('click', () => removePokemon(slotIndex));
    markAnalysisDirty();
  }

  function removePokemon(slotIndex) {
    selectedPokemon[slotIndex - 1] = null;

    const input = document.getElementById(`search-${slotIndex}`);
    const selectedDiv = document.getElementById(`selected-${slotIndex}`);
    const slot = document.getElementById(`slot-${slotIndex}`);

    input.style.display = '';
    input.value = '';
    slot.classList.remove('filled');
    selectedDiv.innerHTML = '';
    markAnalysisDirty();
  }

  // ===== Settings (Mode & Filters) =====
  function setupSettings() {
    const selector = document.getElementById('mode-selector');
    selector.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selector.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.getAttribute('data-mode');
        markAnalysisDirty();
      });
    });

    const bstCb = document.getElementById('filter-bst');
    bstCb.checked = filterMinBst;
    bstCb.addEventListener('change', (e) => {
      filterMinBst = e.target.checked;
      markAnalysisDirty();
    });

    const overlapCb = document.getElementById('filter-overlap');
    overlapCb.checked = filterOverlap;
    overlapCb.addEventListener('change', (e) => {
      filterOverlap = e.target.checked;
      markAnalysisDirty();
    });

    const megaSelect = document.getElementById('filter-mega');
    megaSelect.value = String(filterMaxMega);
    megaSelect.addEventListener('change', (e) => {
      filterMaxMega = parseInt(e.target.value, 10);
      markAnalysisDirty();
    });

    const weaknessSelect = document.getElementById('filter-weakness');
    weaknessSelect.value = filterMaxWeakness;
    weaknessSelect.addEventListener('change', (e) => {
      filterMaxWeakness = e.target.value;
      markAnalysisDirty();
    });

    const uncoveredSelect = document.getElementById('filter-uncovered');
    uncoveredSelect.value = filterMaxUncovered;
    uncoveredSelect.addEventListener('change', (e) => {
      filterMaxUncovered = e.target.value;
      markAnalysisDirty();
    });

    const atkThreatsSelect = document.getElementById('filter-atk-threats');
    atkThreatsSelect.value = filterMaxAtkThreats;
    atkThreatsSelect.addEventListener('change', (e) => {
      filterMaxAtkThreats = e.target.value;
      markAnalysisDirty();
    });

    const defThreatsSelect = document.getElementById('filter-def-threats');
    defThreatsSelect.value = filterMaxDefThreats;
    defThreatsSelect.addEventListener('change', (e) => {
      filterMaxDefThreats = e.target.value;
      markAnalysisDirty();
    });

    const btnAddStatReq = document.getElementById('btn-add-stat-req');
    if (btnAddStatReq) {
      btnAddStatReq.addEventListener('click', () => {
        const typeEl = document.getElementById('stat-req-type-sel');
        const valEl = document.getElementById('stat-req-val-inp');
        const type = typeEl.value;
        const val = parseInt(valEl.value, 10) || 0;
        
        // すでに同じタイプの要件があれば上書き、なければ追加
        const existingIdx = filterStatRequirements.findIndex(r => r.type === type);
        if (existingIdx !== -1) {
          filterStatRequirements[existingIdx].val = val;
        } else {
          filterStatRequirements.push({ type, val });
        }
        
        renderStatRequirements();
        markAnalysisDirty();
      });
    }
  }

  // ===== Analysis Update =====
  async function updateAnalysis() {
    const team = selectedPokemon.filter(p => p !== null);

    if (team.length === 0) {
      analysisSection.style.display = 'none';
      recSection.style.display = 'none';
      renderExcludedList();
      return;
    }

    analysisSection.style.display = '';
    renderBaseAnalysis(team);

    if (team.length >= 1) { // 1匹からでも推薦は出す
      recSection.style.display = '';
      const slots = 6 - team.length;
      const initialTeamIds = team.map(p => p.id);

      let patterns;
      if (useRemoteRecommendApi()) {
        try {
          const data = await remoteRecommend({
            initialTeamIds,
            mode: currentMode,
            slotsToFill: slots,
            options: buildFilterOptions()
          });
          patterns = data.patterns || [];
        } catch (e) {
          console.warn('[App] remote recommend failed, local fallback:', e);
          patterns = recommendTeam(team, allPokemon, currentMode, slots, {
            minBst: filterMinBst,
            noOverlap: filterOverlap,
            maxMega: filterMaxMega,
            excludedIds: excludedPokemon,
            maxWeakness: filterMaxWeakness === 'none' ? null : parseInt(filterMaxWeakness, 10),
            maxUncovered: filterMaxUncovered === 'none' ? null : parseInt(filterMaxUncovered, 10),
            statRequirements: filterStatRequirements,
            requiredTypes: Array.from(filterRequiredTypes),
            maxAtkThreats: filterMaxAtkThreats === 'none' ? null : parseInt(filterMaxAtkThreats, 10),
            maxDefThreats: filterMaxDefThreats === 'none' ? null : parseInt(filterMaxDefThreats, 10),
            searchPatternPoolLimit: SEARCH_PROFILE.patternPoolLimit
          });
        }
      } else {
        patterns = recommendTeam(team, allPokemon, currentMode, slots, {
          minBst: filterMinBst,
          noOverlap: filterOverlap,
          maxMega: filterMaxMega,
          excludedIds: excludedPokemon,
          maxWeakness: filterMaxWeakness === 'none' ? null : parseInt(filterMaxWeakness, 10),
          maxUncovered: filterMaxUncovered === 'none' ? null : parseInt(filterMaxUncovered, 10),
          statRequirements: filterStatRequirements,
          requiredTypes: Array.from(filterRequiredTypes),
          maxAtkThreats: filterMaxAtkThreats === 'none' ? null : parseInt(filterMaxAtkThreats, 10),
          maxDefThreats: filterMaxDefThreats === 'none' ? null : parseInt(filterMaxDefThreats, 10),
          searchPatternPoolLimit: SEARCH_PROFILE.patternPoolLimit
        });
      }
      renderPatterns(patterns, team);
    } else {
      recSection.style.display = 'none';
    }
    
    renderExcludedList();
  }

  // ===== Render Base Analysis =====
  function renderBaseAnalysis(team) {
    const defense = analyzeDefense(team);
    const offense = analyzeOffense(team);

    const weaknessList = document.getElementById('weakness-list');
    if (defense.weaknesses.length === 0) {
      weaknessList.innerHTML = '<span style="color:var(--success);font-weight:500;">✓ 現在の弱点ペナルティなし！</span>';
    } else {
      weaknessList.innerHTML = defense.weaknesses.map(t => `
        <div class="type-item">
          ${createTypeBadgeHTML(t)}
          <span class="multiplier weak">${defense.totalPoints[t]} Pt</span>
        </div>
      `).join('');
    }

    const uncoveredList = document.getElementById('uncovered-list');
    if (offense.notEffective.length === 0) {
      uncoveredList.innerHTML = '<span style="color:var(--success);font-weight:500;">✓ 全タイプに抜群が取れます！</span>';
    } else {
      uncoveredList.innerHTML = offense.notEffective.map(t => `
        <div class="type-item">
          ${createTypeBadgeHTML(t)}
          <span class="multiplier not-very">最大×${offense.bestAttack[t]}</span>
        </div>
      `).join('');
    }

    renderHeatmapDefense('heatmap-labels', 'heatmap-defense', team, true, defense);
  }

  // ===== Render Heatmap =====
  function renderHeatmapDefense(labelsId, containerId, team, showTotal = true, precalcDefense = null) {
    const defenseAnalysis = precalcDefense || analyzeDefense(team);
    const labelsDiv = document.getElementById(labelsId);
    const heatmapDiv = document.getElementById(containerId);

    labelsDiv.innerHTML = '<div style="width:80px;"></div>' + TYPES.map(t =>
      `<div class="heatmap-label" style="color:${TYPE_COLORS[t]};">${TYPE_NAMES_JA[t].slice(0, 2)}</div>`
    ).join('');

    let html = '';

    // 個々のメンバー行
    for (let i = 0; i < team.length; i++) {
      const pokemon = team[i];
      const vec = defenseAnalysis.memberVectors[i];
      
      html += '<div style="display:flex; gap:3px; margin-bottom:3px; align-items:center;">';
      html += `<div style="width:80px; font-size:0.7rem; color:var(--text-secondary); text-align:right; padding-right:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${pokemon.jaName}">${pokemon.jaName}</div>`;
      for (const t of TYPES) {
        const mult = vec[t];
        const display = formatMultiplier(mult);
        // 特性による上書きがあれば専用クラスとツールチップ追加
        const isAbilityOverride = vec._abilityModifier && vec._abilityModifier[t];
        const abilityMod = isAbilityOverride ? ` (特性: ${vec._abilityModifier[t]})` : '';
        const overrideClass = isAbilityOverride ? ' ability-override' : '';

        html += `<div class="heatmap-cell${overrideClass}" data-multiplier="${mult}" title="${TYPE_NAMES_JA[t]}: ×${mult}${abilityMod}">${display}</div>`;
      }
      html += '</div>';
    }

    // 合計PT行
    if (showTotal && team.length > 1) {
      html += '<div style="display:flex; gap:3px; margin-top:6px; padding-top:6px; border-top:1px solid var(--border-glass); align-items:center;">';
      html += '<div style="width:80px; font-size:0.7rem; color:var(--accent-secondary); text-align:right; padding-right:8px; font-weight:700;">合計PT</div>';
      
      for (const t of TYPES) {
        const pt = defenseAnalysis.totalPoints[t];
        let cls = 'pt-neutral';
        if (pt < 0) cls = 'pt-negative';
        else if (pt > 0) cls = 'pt-positive';
        
        const display = pt > 0 ? `+${pt}` : pt;
        html += `<div class="heatmap-cell ${cls}" title="${TYPE_NAMES_JA[t]}: 合計 ${pt}ポイント">${display}</div>`;
      }
      html += '</div>';
    }

    heatmapDiv.innerHTML = html;
  }

  function formatMultiplier(mult) {
    if (mult === 0) return '0';
    if (mult === 0.25) return '¼';
    if (mult === 0.5) return '½';
    if (mult === 1) return '1';
    if (mult === 2) return '2';
    if (mult === 4) return '4';
    return String(mult);
  }

  // ===== Render Recommendation Patterns =====
  function renderPatterns(patterns, originalTeam) {
    if (patterns.length === 0) {
      patternsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🤔</div>
          <p>条件に合う候補が見つかりませんでした。<br>フィルターを緩めてみてください。</p>
        </div>`;
      return;
    }

    let html = '';
    const statKeys = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
    const statLabels = ['H', 'A', 'B', 'C', 'D', 'S'];

    patterns.forEach((pat, index) => {
      const completeTeam = [...originalTeam, ...pat.members];
      
      // 候補カードHTML生成
      const cardsHtml = pat.members.map((p, pIdx) => {
        const stats = p.stats || {};
        
        let alternatesHtml = '';
        if (p.alternates && p.alternates.length > 0) {
          const allOptions = [p, ...p.alternates];
          alternatesHtml = `
            <div class="alternates-list" id="alts-list-${index}-${pIdx}">
              <div style="font-size:0.6rem; color:var(--text-muted); width:100%;">他候補(同タイプ)</div>
              ${allOptions.map(alt => `
                <img src="${alt.sprite}" class="alternate-icon ${alt.id === p.id ? 'active' : ''}" 
                     data-pat="${index}" data-p-idx="${pIdx}" data-id="${alt.id}" 
                     title="${alt.jaName}" onerror="this.style.display='none'">
              `).join('')}
            </div>
          `;
        }

        return `
          <div class="rec-card" id="rec-card-${index}-${pIdx}">
            <button class="btn-lock-card" data-lock-id="${p.id}" title="このポケモンを確定(ロック)する">🔒</button>
            <button class="btn-exclude-card" data-exclude-id="${p.id}" title="候補から除外する">✖</button>
            <div class="card-header">
              <img src="${p.sprite}" class="card-main-img" alt="" onerror="this.style.visibility='hidden'">
              <div>
                <div class="card-name"><span class="card-ja-name">${p.jaName}</span>${p.isMega ? '<span class="mega-badge">M</span>' : ''}</div>
                <div class="card-types">${p.types.map(t => createTypeBadgeHTML(t)).join('')}</div>
              </div>
            </div>
            <div class="stats-container">
              ${statKeys.map((k, idx) => {
                const val = stats[k] || 0;
                const pct = Math.min(val / 200 * 100, 100);
                const color = val >= 120 ? '#00b894' : val >= 80 ? 'var(--accent-secondary)' : val <= 50 ? '#e17055' : 'var(--accent-secondary)';
                return `
                  <div class="stat-row">
                    <span class="stat-label">${statLabels[idx]}</span>
                    <div class="stat-bar-track">
                      <div class="stat-bar-fill stat-fill-${k}" style="width:${pct}%;background:${color};"></div>
                    </div>
                    <span class="stat-value stat-val-${k}">${val}</span>
                  </div>`;
              }).join('')}
              <div class="stat-row" style="margin-top:4px;border-top:1px solid rgba(255,255,255,0.05);padding-top:4px;">
                <span class="stat-label" style="font-weight:700;">計</span>
                <span style="flex:1;"></span>
                <span class="stat-value stat-val-bst" style="font-weight:700;color:var(--text-primary);">${p.bst || 0}</span>
              </div>
            </div>
            ${alternatesHtml}
          </div>
        `;
      }).join('');

      // このパターンのサマリーHTML生成
      const def = pat.teamAnalysis.defense;
      const off = pat.teamAnalysis.offense;
      
      const defSummary = def.weaknesses.length === 0 
        ? '<span style="color:var(--success);font-size:0.8rem;">✓ 弱点ペナルティなし</span>' 
        : def.weaknesses.map(t => `<div class="type-item">${createTypeBadgeHTML(t)} <span class="multiplier weak">${def.totalPoints[t]}Pt</span></div>`).join('');
        
      const offSummary = off.notEffective.length === 0 
        ? '<span style="color:var(--success);font-size:0.8rem;">✓ 全タイプ抜群対応</span>' 
        : off.notEffective.map(t => `<div class="type-item">${createTypeBadgeHTML(t)}</div>`).join('');

      // 誰一人として弱点を突けない「重たい相手」リストアップ
      let fatalThreats = [];
      const completeTeamMoves = completeTeam.map(p => p.types);
      
      // 全員がいずれかの技で弱点を突かれてしまう「受けられない相手」リストアップ
      let defFatalThreats = [];
      const completeTeamDefVecs = completeTeam.map(p => {
         const vec = window.TypeChart.getDefensiveVector(p.types, 'balanced');
         if (p.abilities && p.abilities.includes('levitate')) vec['ground'] = 0;
         if (p.abilities && p.abilities.includes('sap-sipper')) vec['grass'] = 0;
         if (p.abilities && p.abilities.includes('water-absorb')) vec['water'] = 0;
         if (p.abilities && p.abilities.includes('volt-absorb')) vec['electric'] = 0;
         if (p.abilities && p.abilities.includes('flash-fire')) vec['fire'] = 0;
         return vec;
      });
      
      allPokemon.forEach(opp => {
        // [攻撃面] この相手を「個として」処理できるメンバーがいるか？
        // 条件: 弱点を突ける（2倍以上） かつ 相手から弱点を突かれない（2倍未満）
        const defVecOpp = window.TypeChart.getDefensiveVector(opp.types, 'balanced');
        if (opp.abilities && opp.abilities.includes('levitate')) defVecOpp['ground'] = 0;
        if (opp.abilities && opp.abilities.includes('sap-sipper')) defVecOpp['grass'] = 0;
        if (opp.abilities && opp.abilities.includes('water-absorb')) defVecOpp['water'] = 0;
        if (opp.abilities && opp.abilities.includes('volt-absorb')) defVecOpp['electric'] = 0;
        if (opp.abilities && opp.abilities.includes('flash-fire')) defVecOpp['fire'] = 0;
        
        let anyoneCanHandle = false;
        completeTeam.forEach((member, mIdx) => {
          // このメンバーは相手の弱点を突けるか？
          let canHitSE = false;
          member.types.forEach(type => {
            if (defVecOpp[type] >= 2) canHitSE = true;
          });
          // このメンバーは相手のタイプ一致技で弱点を突かれないか？
          let takesSE = false;
          const mVec = completeTeamDefVecs[mIdx];
          opp.types.forEach(oppType => {
            if (mVec[oppType] >= 2) takesSE = true;
          });
          // 弱点を突けて、かつ自分は弱点を突かれない → この1匹で対処可能
          if (canHitSE && !takesSE) anyoneCanHandle = true;
        });
        
        if (!anyoneCanHandle) {
          fatalThreats.push(opp);
        }

        // [防御面] 相手のタイプをどれか半減以下で受けつつ、かつ等倍以上の打点を持つメンバーがいるか？
        let noOneCanHandle = true;
        completeTeam.forEach((member, mIdx) => {
           const mVec = completeTeamDefVecs[mIdx];
           let canResistAny = false;
           opp.types.forEach(oppType => {
              if (mVec[oppType] <= 0.5) canResistAny = true;
           });
           let canHitNeutral = false;
           member.types.forEach(type => {
              if (defVecOpp[type] >= 1) canHitNeutral = true;
           });
           if (canResistAny && canHitNeutral) noOneCanHandle = false;
        });

        if (noOneCanHandle) {
           defFatalThreats.push(opp);
        }
      });
      
      // 種族値降順ソート＆上位抽出
      fatalThreats.sort((a, b) => (b.bst || 0) - (a.bst || 0));
      fatalThreats = fatalThreats.slice(0, 10);
      defFatalThreats.sort((a, b) => (b.bst || 0) - (a.bst || 0));
      defFatalThreats = defFatalThreats.slice(0, 10);
      
      const threatsHtml = fatalThreats.length === 0 
        ? '<span style="color:var(--success);font-size:0.8rem;">⭐ なし！（完璧な攻撃範囲）</span>'
        : fatalThreats.map(t => `<div style="display:inline-block; margin-right:8px; margin-bottom:4px; background:rgba(0,0,0,0.2); padding:2px 8px; border-radius:12px; border:1px solid rgba(225, 112, 85, 0.4); font-size:0.75rem;"><img src="${t.sprite}" style="width:24px; vertical-align:middle; margin-right:4px;">${t.jaName}</div>`).join('');

      const defThreatsHtml = defFatalThreats.length === 0 
        ? '<span style="color:var(--success);font-size:0.8rem;">⭐ なし！（完璧な一貫性カット）</span>'
        : defFatalThreats.map(t => `<div style="display:inline-block; margin-right:8px; margin-bottom:4px; background:rgba(0,0,0,0.2); padding:2px 8px; border-radius:12px; border:1px solid rgba(9, 132, 227, 0.4); font-size:0.75rem;"><img src="${t.sprite}" style="width:24px; vertical-align:middle; margin-right:4px;">${t.jaName}</div>`).join('');

      // パーティ全体ヒートマップ用のユニークID
      const heatmapLabelsId = `pat-hm-labels-${index}`;
      const heatmapContainerId = `pat-hm-content-${index}`;

      const tc = pat.threatCount || { attack: fatalThreats.length, defense: defFatalThreats.length, total: fatalThreats.length + defFatalThreats.length };

      html += `
        <div class="pattern-section">
          <div class="pattern-header">
            <div class="pattern-title">第${index + 1}候補 🎉 <span style="font-size:0.7rem; color:var(--text-muted); font-weight:normal; margin-left:8px;">重たい相手: ⚔️${tc.attack} / 🛡️${tc.defense}</span></div>
          </div>
          <div class="pattern-content">
            <div class="rec-grid">
              ${cardsHtml}
            </div>
            
            <!-- Pattern Summary -->
            <div class="pattern-summary">
              <div class="team-members">
                ${completeTeam.map(cp => `
                  <div class="team-mini-card">
                    <img src="${cp.sprite}" onerror="this.style.display='none'">
                    ${cp.jaName}
                  </div>
                `).join('')}
              </div>
              <div class="analysis-grid" style="margin-top:20px; gap:16px;">
                <div>
                  <h4 style="font-size:0.85rem; margin-bottom:8px; color:var(--text-secondary);">🛡️ 残り弱点ペナルティ</h4>
                  <div class="type-list">${defSummary}</div>
                </div>
                <div>
                  <h4 style="font-size:0.85rem; margin-bottom:8px; color:var(--text-secondary);">⚔️ 抜群が取れないタイプ</h4>
                  <div class="type-list">${offSummary}</div>
                </div>
                <div style="grid-column: 1 / -1;">
                  <h4 style="font-size:0.85rem; margin-bottom:8px; color:var(--danger);">🚨 【攻撃面】重たい相手（誰も弱点を突けない） <span style="font-size:0.6rem; color:var(--text-muted); font-weight:normal;">※上位10匹迄</span></h4>
                  <div>${threatsHtml}</div>
                </div>
                <div style="grid-column: 1 / -1; margin-top:-8px;">
                  <h4 style="font-size:0.85rem; margin-bottom:8px; color:var(--accent-primary);">🛡️ 【防御面】重たい相手（全員が弱点を突かれる） <span style="font-size:0.6rem; color:var(--text-muted); font-weight:normal;">※上位10匹迄</span></h4>
                  <div>${defThreatsHtml}</div>
                </div>
              </div>
              
              <div class="heatmap-container" style="margin-top:20px;">
                <div style="font-size:0.8rem; margin-bottom:8px; color:var(--text-muted);">完成パーティのヒートマップ</div>
                <div style="display:flex; gap:3px; margin-bottom:4px;" id="${heatmapLabelsId}"></div>
                <div id="${heatmapContainerId}"></div>
              </div>
            </div>
            
          </div>
        </div>
      `;
    });

    patternsContainer.innerHTML = html;

    // 代替（オルト）アイコンのクリック処理
    patternsContainer.querySelectorAll('.alternate-icon').forEach(icon => {
      icon.addEventListener('click', (e) => {
        const t = e.currentTarget;
        const patIdx = t.getAttribute('data-pat');
        const pIdx = t.getAttribute('data-p-idx');
        const newId = t.getAttribute('data-id');
        
        const card = document.getElementById(`rec-card-${patIdx}-${pIdx}`);
        const altContainer = document.getElementById(`alts-list-${patIdx}-${pIdx}`);
        if (!card || !altContainer) return;
        
        altContainer.querySelectorAll('.alternate-icon').forEach(i => i.classList.remove('active'));
        t.classList.add('active');
        
        const newPokemon = allPokemon.find(p => p.id === newId);
        if (!newPokemon) return;
        
        card.querySelector('.card-main-img').src = newPokemon.sprite;
        const isMegaStr = newPokemon.isMega ? '<span class="mega-badge">M</span>' : '';
        card.querySelector('.card-name').innerHTML = `<span class="card-ja-name">${newPokemon.jaName}</span>${isMegaStr}`;
        card.querySelector('.btn-lock-card').setAttribute('data-lock-id', newPokemon.id);
        card.querySelector('.btn-exclude-card').setAttribute('data-exclude-id', newPokemon.id);
        
        const stats = newPokemon.stats || {};
        statKeys.forEach(k => {
          const val = stats[k] || 0;
          const pct = Math.min(val / 200 * 100, 100);
          const color = val >= 120 ? '#00b894' : val >= 80 ? 'var(--accent-secondary)' : val <= 50 ? '#e17055' : 'var(--accent-secondary)';
          
          card.querySelector(`.stat-fill-${k}`).style.width = pct + '%';
          card.querySelector(`.stat-fill-${k}`).style.background = color;
          card.querySelector(`.stat-val-${k}`).textContent = val;
        });
        card.querySelector('.stat-val-bst').textContent = newPokemon.bst || 0;
      });
    });

    // パターンごとのヒートマップを描画
    patterns.forEach((pat, index) => {
      const completeTeam = [...originalTeam, ...pat.members];
      renderHeatmapDefense(`pat-hm-labels-${index}`, `pat-hm-content-${index}`, completeTeam, true, pat.teamAnalysis.defense);
    });

    // ロックボタンのイベントリスナーを登録
    const lockBtns = patternsContainer.querySelectorAll('.btn-lock-card');
    lockBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-lock-id');
        const pokemon = allPokemon.find(poke => poke.id === id);
        if (pokemon) {
          const emptySlotIdx = selectedPokemon.findIndex(p => p === null);
          if (emptySlotIdx !== -1) {
            selectPokemon(emptySlotIdx + 1, pokemon);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            alert('スロットが上限に達しています。');
          }
        }
      });
    });

    // 除外ボタンのイベントリスナーを登録
    const excludeBtns = patternsContainer.querySelectorAll('.btn-exclude-card');
    excludeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-exclude-id');
        if (id) {
          excludedPokemon.add(id);
          saveExcludedPokemon();
          updateAnalysis();
        }
      });
    });
  }

  // ===== Render Stat Requirements =====
  function renderStatRequirements() {
    const listDiv = document.getElementById('stat-req-list');
    if (!listDiv) return;

    if (filterStatRequirements.length === 0) {
      listDiv.innerHTML = '';
      return;
    }

    const typeLabels = {
      'hp': 'HP', 'attack': '攻撃', 'defense': '防御', 
      'special-attack': '特攻', 'special-defense': '特防', 'speed': '素早さ'
    };

    let html = '';
    filterStatRequirements.forEach((req, idx) => {
      html += `
        <div class="excluded-badge" style="background:rgba(108, 92, 231, 0.15); border-color:var(--accent-primary);">
          <span style="font-weight:700; margin-right:4px;">${typeLabels[req.type]}</span> ${req.val}以上
          <span class="btn-unexclude-stat" data-idx="${idx}" style="margin-left:6px; cursor:pointer; font-size:0.8rem;">✖</span>
        </div>
      `;
    });
    listDiv.innerHTML = html;

    listDiv.querySelectorAll('.btn-unexclude-stat').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        filterStatRequirements.splice(idx, 1);
        renderStatRequirements();
        markAnalysisDirty();
      });
    });
  }

  // ===== Render Excluded List =====
  function renderExcludedList() {
    const container = document.getElementById('excluded-container');
    const listDiv = document.getElementById('excluded-list');

    if (excludedPokemon.size === 0) {
      container.style.display = 'none';
      listDiv.innerHTML = '';
      return;
    }

    container.style.display = '';
    let html = '';
    for (const id of excludedPokemon) {
      const p = allPokemon.find(poke => poke.id === id);
      if (p) {
        html += `
          <div class="excluded-badge" data-exclude-id="${p.id}">
            <img src="${p.sprite}" onerror="this.style.visibility='hidden'">
            <span>${p.jaName}</span>
            <span class="btn-unexclude">✖</span>
          </div>
        `;
      }
    }
    listDiv.innerHTML = html;

    listDiv.querySelectorAll('.excluded-badge').forEach(badge => {
      badge.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-exclude-id');
        if (id) {
          excludedPokemon.delete(id);
          saveExcludedPokemon();
          updateAnalysis();
        }
      });
    });
  }

  // ===== Utility: Type Badge HTML =====
  function createTypeBadgeHTML(type) {
    const name = TYPE_NAMES_JA[type] || type;
    const color = TYPE_COLORS[type] || '#888';
    return `<span class="type-badge" style="background:${color};">${name}</span>`;
  }

  // ===== Best Pair Analysis =====
  let candidatePool = [];
  let poolExcluded = new Set(); // ペア分析用の除外リスト

  function setupBestPairSection() {
    const searchInput = document.getElementById('pool-search');
    const dropdown = document.getElementById('pool-dropdown');
    const poolDisplay = document.getElementById('pool-members');
    const btnAnalyze = document.getElementById('btn-analyze-pairs');
    const btnClear = document.getElementById('btn-clear-pool');
    const resultsDiv = document.getElementById('pair-results');
    const noOverlapCheckbox = document.getElementById('pool-no-overlap');
    const excludedContainer = document.getElementById('pool-excluded-container');
    const excludedList = document.getElementById('pool-excluded-list');

    if (!searchInput) return;

    // 検索ドロップダウン
    function handlePoolSearch() {
      const query = searchInput.value.toLowerCase().trim();
      const queryKatakana = query.replace(/[\u3041-\u3096]/g, match => String.fromCharCode(match.charCodeAt(0) + 0x60));

      if (query.length < 1) { dropdown.classList.remove('active'); return; }

      const poolIds = new Set(candidatePool.map(p => p.id));
      const filtered = allPokemon.filter(p => !poolIds.has(p.id) && (
        p.jaName.toLowerCase().includes(query) ||
        p.jaName.toLowerCase().includes(queryKatakana) ||
        p.name.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query)
      )).slice(0, 30);

      if (filtered.length === 0) {
        dropdown.innerHTML = '<div class="dropdown-item" style="justify-content:center;color:var(--text-muted);pointer-events:none;">見つかりませんでした</div>';
        dropdown.classList.add('active');
        return;
      }

      dropdown.innerHTML = filtered.map(p => `
        <div class="dropdown-item" data-poke-id="${p.id}" style="display:flex; align-items:center; gap:8px; padding:6px 10px; cursor:pointer;">
          <img src="${p.sprite}" style="width:32px;height:32px;" loading="lazy" onerror="this.style.visibility='hidden'">
          <span>${p.jaName}</span>
          <span style="color:var(--text-muted); font-size:0.7rem;">${p.types.map(t => TYPE_NAMES_JA[t]).join('/')}</span>
        </div>
      `).join('');
      dropdown.classList.add('active');

      // mousedownを使う（blurより先に発火するため確実に選択できる）
      dropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('mousedown', (e) => {
          e.preventDefault(); // blurを防ぐ
          const id = item.getAttribute('data-poke-id');
          const p = allPokemon.find(pk => pk.id === id);
          if (p && !candidatePool.find(c => c.id === id)) {
            candidatePool.push(p);
            renderPool();
          }
          searchInput.value = '';
          dropdown.classList.remove('active');
          searchInput.focus(); // 連続追加しやすいようにフォーカスを維持
        });
      });
    }

    searchInput.addEventListener('input', handlePoolSearch);
    searchInput.addEventListener('focus', handlePoolSearch);

    // ドロップダウン外クリックで閉じる
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#bestpair-section')) {
        dropdown.classList.remove('active');
      }
    });

    btnClear.addEventListener('click', () => {
      candidatePool = [];
      poolExcluded = new Set();
      renderPool();
      renderPoolExcluded();
      resultsDiv.innerHTML = '';
    });

    btnAnalyze.addEventListener('click', () => {
      if (candidatePool.length < 2) {
        alert('候補プールに少なくとも2匹追加してください');
        return;
      }
      analyzeBestPairs();
    });

    function renderPool() {
      poolDisplay.innerHTML = candidatePool.length === 0 
        ? '<span style="color:var(--text-muted); font-size:0.85rem;">候補プールにポケモンを追加してください</span>'
        : candidatePool.map((p, i) => `
          <div class="pool-badge" data-idx="${i}" style="display:inline-flex; align-items:center; gap:4px; background:rgba(255,255,255,0.08); padding:4px 10px; border-radius:20px; cursor:pointer; border:1px solid var(--border-glass);" title="クリックで除去">
            <img src="${p.sprite}" style="width:24px;height:24px;">
            <span style="font-size:0.8rem;">${p.jaName}</span>
            <span style="color:var(--danger); font-size:0.7rem;">✕</span>
          </div>
        `).join('');

      poolDisplay.querySelectorAll('.pool-badge').forEach(badge => {
        badge.addEventListener('click', () => {
          const idx = parseInt(badge.getAttribute('data-idx'));
          candidatePool.splice(idx, 1);
          renderPool();
        });
      });
    }
    renderPool();

    function renderPoolExcluded() {
      if (poolExcluded.size === 0) {
        excludedContainer.style.display = 'none';
        return;
      }
      excludedContainer.style.display = 'block';
      const items = Array.from(poolExcluded).map(id => allPokemon.find(p => p.id === id)).filter(Boolean);
      excludedList.innerHTML = items.map(p => `
        <div class="pool-excl-badge" data-excl-id="${p.id}" style="display:inline-flex; align-items:center; gap:3px; background:rgba(255,0,0,0.1); padding:3px 8px; border-radius:12px; cursor:pointer; border:1px solid rgba(255,0,0,0.3); font-size:0.75rem;">
          <img src="${p.sprite}" style="width:20px;height:20px;">
          ${p.jaName} ✕
        </div>
      `).join('');
      excludedList.querySelectorAll('.pool-excl-badge').forEach(badge => {
        badge.addEventListener('click', () => {
          poolExcluded.delete(badge.getAttribute('data-excl-id'));
          renderPoolExcluded();
        });
      });
    }

    function analyzeBestPairs() {
      function getSameTypeAlternates(basePokemon, limit = 4) {
        const baseTypeSignature = getPokemonTypeSignature(basePokemon);
        return allPokemon
          .filter(p => {
            if (p.id === basePokemon.id) return false;
            if (excludedPokemon.has(p.id) || poolExcluded.has(p.id)) return false;
            const sig = getPokemonTypeSignature(p);
            return sig === baseTypeSignature;
          })
          .sort((a, b) => {
            return (b.bst || 0) - (a.bst || 0);
          })
          .slice(0, limit);
      }

      const totalPairs = candidatePool.length * (candidatePool.length - 1) / 2;
      resultsDiv.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted);">⏳ ${totalPairs}通りのペアを検証中... しばらくお待ちください</div>`;

      // 現在のフィルター設定を読み取る
      const maxWeaknessVal = filterMaxWeakness === 'none' ? null : parseInt(filterMaxWeakness, 10);
      const maxUncoveredVal = filterMaxUncovered === 'none' ? null : parseInt(filterMaxUncovered, 10);
      const maxAtkThreatsVal = filterMaxAtkThreats === 'none' ? null : parseInt(filterMaxAtkThreats, 10);
      const maxDefThreatsVal = filterMaxDefThreats === 'none' ? null : parseInt(filterMaxDefThreats, 10);

      const opts = {
        minBst: filterMinBst,
        // ベストペア分析では、タイプ被り制御を専用チェックボックスに一本化する
        noOverlap: false,
        maxMega: filterMaxMega,
        excludedIds: excludedPokemon,
        maxWeakness: maxWeaknessVal,
        maxUncovered: maxUncoveredVal,
        statRequirements: filterStatRequirements,
        requiredTypes: Array.from(filterRequiredTypes),
        maxAtkThreats: maxAtkThreatsVal,
        maxDefThreats: maxDefThreatsVal,
        searchPatternPoolLimit: SEARCH_PROFILE.patternPoolLimit
      };

      setTimeout(async () => {
        const results = [];
        const poolNoOverlap = noOverlapCheckbox && noOverlapCheckbox.checked;
        const mergedExcluded = new Set([...excludedPokemon, ...poolExcluded]);
        opts.excludedIds = mergedExcluded;
        if (poolNoOverlap) opts.noOverlap = true;

        const activeCandidates = candidatePool.filter(p => !poolExcluded.has(p.id));
        const totalActivePairs = activeCandidates.length * (activeCandidates.length - 1) / 2;

        const remoteOpts = buildFilterOptions({
          noOverlap: poolNoOverlap,
          excludedIds: mergedExcluded
        });

        for (let i = 0; i < activeCandidates.length; i++) {
          for (let j = i + 1; j < activeCandidates.length; j++) {
            const pair = [activeCandidates[i], activeCandidates[j]];

            if (poolNoOverlap) {
              const typesA = new Set(pair[0].types);
              const hasOverlap = pair[1].types.some(t => typesA.has(t));
              if (hasOverlap) continue;
            }

            let patterns;
            if (useRemoteRecommendApi()) {
              try {
                const data = await remoteRecommend({
                  initialTeamIds: pair.map(p => p.id),
                  mode: currentMode,
                  slotsToFill: 4,
                  options: remoteOpts
                });
                patterns = data.patterns || [];
              } catch (e) {
                console.warn('[App] remote recommend (pair) failed, local:', e);
                patterns = recommendTeam(pair, allPokemon, currentMode, 4, opts);
              }
            } else {
              patterns = recommendTeam(pair, allPokemon, currentMode, 4, opts);
            }

            if (patterns.length > 0) {
              const best = patterns[0];
              const completeTeam = [...pair, ...best.members];
              results.push({
                pair,
                recommended: best.members,
                completeTeam,
                analysis: best.teamAnalysis,
                tc: best.threatCount
              });
            }
          }
        }

        results.sort((a, b) => a.tc.total - b.tc.total);
        const top = results.slice(0, 30);

        if (top.length === 0) {
          resultsDiv.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger);">❌ 条件を満たすパーティが見つかりませんでした。フィルター設定を緩めてみてください。</div>`;
          return;
        }

        resultsDiv.innerHTML = `
          <h4 style="font-size:0.9rem; margin-bottom:12px; color:var(--text-secondary);">🏆 ベストチーム構成（${activeCandidates.length}匹から${totalActivePairs}通り検証 → ${results.length}件該当 → 上位30件）</h4>
          <div style="display:flex; flex-direction:column; gap:16px;">
            ${top.map((r, rank) => {
              const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank+1}`;
              const defPen = r.analysis.defense.penaltySum;
              const uncov = r.analysis.offense.notEffective.length;
              return `
                <div style="background:rgba(255,255,255,0.04); padding:16px; border-radius:12px; ${rank < 3 ? 'border:1px solid var(--accent-primary);' : 'border:1px solid var(--border-glass);'}">
                  <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                    <span style="font-size:1.3rem;">${medal}</span>
                    <span style="font-size:0.85rem; font-weight:700;">コア: ${r.pair[0].jaName} + ${r.pair[1].jaName}</span>
                    <span style="flex:1;"></span>
                    <span style="font-size:0.7rem; color:var(--danger);">⚔️${r.tc.attack}</span>
                    <span style="font-size:0.7rem; color:var(--accent-primary);">🛡️${r.tc.defense}</span>
                    <span style="font-size:0.75rem; font-weight:700;">計${r.tc.total}</span>
                  </div>
                  <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
                    ${r.completeTeam.map((p, idx) => `
                      ${(() => {
                        const alternates = getSameTypeAlternates(p, 3);
                        const alternatesHtml = alternates.length > 0
                          ? `<div style="margin-top:4px; font-size:0.55rem; color:var(--text-muted); text-align:center; line-height:1.3;">
                               他候補: ${alternates.map(alt => alt.jaName).join(' / ')}
                             </div>`
                          : '';
                        return `
                      <div style="display:flex; flex-direction:column; align-items:center; width:70px; padding:6px; border-radius:8px; background:${idx < 2 ? 'rgba(116, 185, 255, 0.15)' : 'rgba(255,255,255,0.05)'}; border:1px solid ${idx < 2 ? 'rgba(116, 185, 255, 0.3)' : 'var(--border-glass)'}; position:relative;">
                        <img src="${p.sprite}" style="width:40px;height:40px;">
                        <div style="font-size:0.65rem; font-weight:700; text-align:center; margin-top:2px;">${p.jaName}</div>
                        <div style="display:flex; gap:1px; margin-top:2px;">${p.types.map(t => `<span style="font-size:0.5rem; padding:0 3px; border-radius:3px; background:${TYPE_COLORS[t]}; color:white;">${TYPE_NAMES_JA[t]}</span>`).join('')}</div>
                        ${alternatesHtml}
                        <button class="pool-exclude-btn" data-excl-poke="${p.id}" style="position:absolute; top:-4px; right:-4px; width:18px; height:18px; border-radius:50%; background:var(--danger); color:white; border:none; font-size:0.6rem; cursor:pointer; line-height:18px; padding:0;" title="${p.jaName}を除外">🚫</button>
                      </div>
                    `;
                      })()}
                    `).join('')}
                  </div>
                  <div style="font-size:0.7rem; color:var(--text-muted);">
                    🛡️弱点ペナルティ: ${defPen}pt ｜ ⚔️抜群取れないタイプ: ${uncov}個
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;

        // 除外ボタンのイベント
        resultsDiv.querySelectorAll('.pool-exclude-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-excl-poke');
            poolExcluded.add(id);
            renderPoolExcluded();
            analyzeBestPairs(); // 再分析
          });
        });
      }, 50);
    }
  }

  // ===== Start =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
