// ==========================================
// server.js — Express API サーバー（Worker Threads 並列探索）
// ==========================================

'use strict';

const express = require('express');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;
const { Worker } = require('worker_threads');
const { v4: uuidv4 } = require('uuid');
const { loadAllPokemon } = require('./pokemonData.node');
const { recommendTeamSync, mergePatternResults } = require('./teamAnalyzer.node');

const app = express();
const PORT = process.env.PORT || 3000;
const NUM_WORKERS = parseInt(process.env.NUM_WORKERS, 10) || os.cpus().length;

app.use(express.json({ limit: '10mb' }));

// 静的ファイル配信（親ディレクトリ = pokemon/）
app.use(express.static(path.join(__dirname, '..')));

// ポケモンデータ（起動時にロード）
let allPokemon = null;
let dataReady = false;

// ジョブ管理（cloud-perfect 用）
const jobs = new Map();

// =========================================
// API: Health Check
// =========================================
app.get('/api/health', (req, res) => {
  res.json({
    status: dataReady ? 'ok' : 'loading',
    pokemonCount: allPokemon ? allPokemon.length : 0,
    cpuCount: NUM_WORKERS,
    uptime: process.uptime()
  });
});

// =========================================
// API: Settings (Excluded & Recent Pokemon)
// =========================================
const SETTINGS_FILE = path.join(__dirname, 'settings.json');

app.get('/api/settings', async (req, res) => {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    res.json(JSON.parse(data));
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.json({ excludedIds: [], recentIds: [] });
    } else {
      res.status(500).json({ error: 'Failed to read settings' });
    }
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { excludedIds = [], recentIds = [] } = req.body;
    await fs.writeFile(SETTINGS_FILE, JSON.stringify({ excludedIds, recentIds }), 'utf-8');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// =========================================
// API: Recommend（メイン検索 — Worker Threads 並列）
// =========================================
app.post('/api/recommend', async (req, res) => {
  if (!dataReady) return res.status(503).json({ error: 'Pokemon data not loaded yet' });

  try {
    const { initialTeamIds, mode, slotsToFill, options } = req.body;

    // initialTeamIds → initialTeam（ポケモンオブジェクト配列へ復元）
    const idMap = new Map(allPokemon.map(p => [p.id, p]));
    const initialTeam = (initialTeamIds || []).map(id => idMap.get(id)).filter(Boolean);

    const slots = slotsToFill || (6 - initialTeam.length);
    const mergedOptions = {
      minBst: false, noOverlap: false, maxMega: 6,
      ...options,
      excludedIds: options?.excludedIds || []
    };

    const startMs = Date.now();
    console.log(`[Recommend] team=${initialTeamIds?.length || 0} slots=${slots} mode=${mode} workers=${NUM_WORKERS}`);

    // searchPool のサイズを事前計算（分割のため）
    const preRunResult = recommendTeamSync({
      initialTeam, allPokemon, mode, slotsToFill: slots,
      options: { ...mergedOptions, searchPatternPoolLimit: 1 }, // 即座に返す
      rangeStart: 0, rangeEnd: 0 // 探索しない（searchPool 構築のみ）
    });
    const poolSize = preRunResult.searchPool.length;

    if (poolSize === 0 || slots <= 0) {
      return res.json({ patterns: [] });
    }

    // Worker数を候補数に応じて調整
    const effectiveWorkers = Math.min(NUM_WORKERS, poolSize);

    if (effectiveWorkers <= 1) {
      // Worker 1つなら直接実行（スレッド生成コスト回避）
      const result = recommendTeamSync({
        initialTeam, allPokemon, mode, slotsToFill: slots,
        options: mergedOptions
      });
      console.log(`[Recommend] done single-thread: ${result.patterns.length} patterns in ${Date.now() - startMs}ms`);
      return res.json({ patterns: result.patterns });
    }

    // 並列実行
    const workerPromises = [];

    for (let w = 0; w < effectiveWorkers; w++) {
      const promise = new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, 'searchWorker.js'), {
          workerData: {
            initialTeam, allPokemon, mode, slotsToFill: slots,
            options: mergedOptions,
            workerId: w, numWorkers: effectiveWorkers
          }
        });

        worker.on('message', (msg) => {
          if (msg.type === 'done') {
            resolve({ patterns: msg.patterns, stats: msg.stats });
          } else if (msg.type === 'error') {
            reject(new Error(msg.error));
          }
        });
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0) reject(new Error(`Worker ${w} exited with code ${code}`));
        });
      });
      workerPromises.push(promise);
    }

    const results = await Promise.all(workerPromises);
    const merged = mergePatternResults(results);
    const elapsedMs = Date.now() - startMs;

    console.log(`[Recommend] done parallel(${effectiveWorkers}w): ${merged.length} patterns in ${elapsedMs}ms`);
    res.json({ patterns: merged });

  } catch (err) {
    console.error('[Recommend] Error:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

// =========================================
// API: Cloud Perfect — ジョブ開始
// =========================================
app.post('/api/cloud-perfect/start', (req, res) => {
  if (!dataReady) return res.status(503).json({ error: 'Pokemon data not loaded yet' });

  const { excludedIds = [] } = req.body;
  const jobId = uuidv4();

  const job = {
    id: jobId,
    status: 'running',
    startedAt: Date.now(),
    checked: 0,
    matched: 0,
    totalEstimate: null,
    percent: 0,
    patterns: null,
    error: null
  };
  jobs.set(jobId, job);

  // バックグラウンドで探索実行
  runCloudPerfectJob(job, excludedIds).catch(err => {
    job.status = 'error';
    job.error = err.message || String(err);
  });

  console.log(`[CloudPerfect] Job started: ${jobId}`);
  res.json({ jobId });
});

async function runCloudPerfectJob(job, excludedIds) {
  const mergedOptions = {
    minBst: false,
    noOverlap: true,
    maxMega: 3,
    excludedIds,
    maxWeakness: 0,
    maxUncovered: 0,
    statRequirements: [],
    requiredTypes: [],
    maxAtkThreats: 0,
    maxDefThreats: 0,
    atkThreatsMode: 'lte',
    defThreatsMode: 'lte'
  };

  const startMs = Date.now();

  // searchPool サイズ事前取得
  const preRun = recommendTeamSync({
    initialTeam: [], allPokemon, mode: 'balanced', slotsToFill: 6,
    options: { ...mergedOptions, searchPatternPoolLimit: 1 },
    rangeStart: 0, rangeEnd: 0
  });
  const poolSize = preRun.searchPool.length;
  job.totalEstimate = poolSize;

  const effectiveWorkers = Math.min(NUM_WORKERS, poolSize);
  
  // Workerの進捗を個別に管理
  job.workers = Array.from({ length: effectiveWorkers }, () => ({ percent: 0, checked: 0, patterns: [] }));
  const workerPromises = [];

  for (let w = 0; w < effectiveWorkers; w++) {
    const promise = new Promise((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, 'searchWorker.js'), {
        workerData: {
          initialTeam: [], allPokemon, mode: 'balanced', slotsToFill: 6,
          options: mergedOptions,
          workerId: w, numWorkers: effectiveWorkers
        }
      });

      worker.on('message', (msg) => {
        if (msg.type === 'progress') {
          job.workers[w].percent = msg.percent || 0;
          job.workers[w].checked = msg.leafEvaluated || 0;
          job.workers[w].patterns = msg.patterns || [];

          // 全Workerの進捗を合算
          job.percent = Math.floor(job.workers.reduce((s, wk) => s + wk.percent, 0) / effectiveWorkers);
          job.checked = job.workers.reduce((s, wk) => s + wk.checked, 0);
        } else if (msg.type === 'done') {
          resolve({ patterns: msg.patterns, stats: msg.stats });
        } else if (msg.type === 'error') {
          reject(new Error(msg.error));
        }
      });
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`Worker ${w} exited with code ${code}`));
      });
    });
    workerPromises.push(promise);
  }

  const results = await Promise.all(workerPromises);
  const merged = mergePatternResults(results);
  const elapsedMs = Date.now() - startMs;

  job.patterns = merged;
  job.matched = merged.length;
  job.percent = 100;
  job.status = 'done';
  console.log(`[CloudPerfect] Job ${job.id} done: ${merged.length} patterns in ${elapsedMs}ms`);

  // 24時間後にジョブを削除（後から復元できるように長めに保持）
  setTimeout(() => jobs.delete(job.id), 24 * 60 * 60 * 1000);
}

// =========================================
// API: Cloud Perfect — ステータス取得
// =========================================
app.get('/api/cloud-perfect/status/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  let matched = job.matched;
  if (job.status === 'running' && job.workers) {
    const workerResults = job.workers.map(w => ({ patterns: w.patterns || [] }));
    matched = mergePatternResults(workerResults).length;
  }

  res.json({
    status: job.status,
    checked: job.checked || 0,
    matched: matched || 0,
    totalEstimate: job.totalEstimate,
    percent: job.percent || 0,
    error: job.error
  });
});

// =========================================
// API: Cloud Perfect — 結果取得
// =========================================
app.get('/api/cloud-perfect/result/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  if (job.status === 'error') return res.status(500).json({ error: job.error });

  if (job.status === 'done') {
    return res.json({ patterns: job.patterns || [] });
  }

  // 実行中の場合は途中経過を返す
  if (job.status === 'running' && job.workers) {
    const workerResults = job.workers.map(w => ({ patterns: w.patterns || [] }));
    const merged = mergePatternResults(workerResults);
    // 途中結果が多すぎると重くなるため、トップ100件に制限
    return res.json({ patterns: merged.slice(0, 100) });
  }

  res.json({ patterns: [] });
});

// =========================================
// API: Cloud Job — キャンセル
// =========================================
app.post('/api/cloud-perfect/cancel/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (job && job.status === 'running') {
    job.status = 'cancelled';
  }
  res.json({ success: true });
});

// =========================================
// Legacy: POST /api/cloud-perfect（同期版フォールバック）
// =========================================
app.post('/api/cloud-perfect', async (req, res) => {
  if (!dataReady) return res.status(503).json({ error: 'Pokemon data not loaded yet' });

  try {
    const { excludedIds = [] } = req.body;
    const mergedOptions = {
      minBst: false, noOverlap: true, maxMega: 3,
      excludedIds, maxWeakness: 0, maxUncovered: 0,
      statRequirements: [], requiredTypes: [],
      maxAtkThreats: 0, maxDefThreats: 0,
      atkThreatsMode: 'lte', defThreatsMode: 'lte'
    };

    const result = recommendTeamSync({
      initialTeam: [], allPokemon, mode: 'balanced', slotsToFill: 6,
      options: mergedOptions
    });
    res.json({ patterns: result.patterns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================
// API: Cloud Best Core — ジョブ開始
// =========================================
app.post('/api/cloud-bestcore/start', (req, res) => {
  if (!dataReady) return res.status(503).json({ error: 'Pokemon data not loaded yet' });

  const { candidatePoolIds = [], options = {} } = req.body;
  if (candidatePoolIds.length < 2) return res.status(400).json({ error: 'At least 2 candidates required' });

  const jobId = uuidv4();
  const job = {
    id: jobId,
    type: 'bestcore',
    status: 'running',
    startedAt: Date.now(),
    checked: 0,
    matched: 0,
    totalEstimate: null, // this will be total pairs
    percent: 0,
    patterns: [],
    error: null
  };
  jobs.set(jobId, job);

  runCloudBestcoreJob(job, candidatePoolIds, options).catch(err => {
    job.status = 'error';
    job.error = err.message || String(err);
  });

  console.log(`[CloudBestCore] Job started: ${jobId}`);
  res.json({ jobId });
});

async function runCloudBestcoreJob(job, candidatePoolIds, options) {
  const mergedOptions = {
    minBst: false,
    noOverlap: false,
    maxMega: 6,
    excludedIds: [],
    maxWeakness: null,
    maxUncovered: null,
    statRequirements: [],
    requiredTypes: [],
    maxAtkThreats: null,
    maxDefThreats: null,
    atkThreatsMode: 'lte',
    defThreatsMode: 'lte',
    searchPatternPoolLimit: 60,
    ...options
  };

  const idMap = new Map(allPokemon.map(p => [p.id, p]));
  const activeCandidates = candidatePoolIds.map(id => idMap.get(id)).filter(Boolean);

  const pairsToCheck = [];
  for (let i = 0; i < activeCandidates.length; i++) {
    for (let j = i + 1; j < activeCandidates.length; j++) {
      const pair = [activeCandidates[i], activeCandidates[j]];
      if (mergedOptions.noOverlap) {
        const typesA = new Set(pair[0].types);
        const hasOverlap = pair[1].types.some(t => typesA.has(t));
        if (hasOverlap) continue;
      }
      pairsToCheck.push(pair);
    }
  }

  job.totalEstimate = pairsToCheck.length;
  if (pairsToCheck.length === 0) {
    job.status = 'done';
    job.percent = 100;
    return;
  }

  const effectiveWorkers = Math.min(NUM_WORKERS, pairsToCheck.length);
  let nextPairIdx = 0;

  const workerTask = async (wId) => {
    while (nextPairIdx < pairsToCheck.length) {
      if (job.status === 'cancelled') break;
      const pairIdx = nextPairIdx++;
      const pair = pairsToCheck[pairIdx];

      try {
        const patterns = await new Promise((resolve, reject) => {
          const worker = new Worker(path.join(__dirname, 'searchWorker.js'), {
            workerData: {
              initialTeam: pair, allPokemon, mode: 'balanced', slotsToFill: 4,
              options: mergedOptions,
              workerId: 0, numWorkers: 1
            }
          });
          
          worker.on('message', (msg) => {
             if (msg.type === 'done') resolve(msg.patterns || []);
             else if (msg.type === 'error') reject(new Error(msg.error));
          });
          worker.on('error', reject);
          worker.on('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
          });
        });

        for (const pat of patterns) {
          pat.pair = pair;
          pat.completeTeam = [...pair, ...pat.team];
          job.patterns.push(pat);
        }

        job.patterns.sort((a, b) => {
          const tcDelta = (a.threatCount?.total || 0) - (b.threatCount?.total || 0);
          if (tcDelta !== 0) return tcDelta;
          const bstA = a.completeTeam.reduce((sum, p) => sum + (p.bst || 0), 0);
          const bstB = b.completeTeam.reduce((sum, p) => sum + (p.bst || 0), 0);
          return bstB - bstA;
        });
        if (job.patterns.length > 60) job.patterns.length = 60;
        
        job.matched = job.patterns.length;

      } catch (e) {
        console.error(`[CloudBestCore] Worker error for pair ${pairIdx}:`, e);
      }

      job.checked++;
      job.percent = Math.floor((job.checked / pairsToCheck.length) * 100);
    }
  };

  const tasks = Array.from({ length: effectiveWorkers }, (_, i) => workerTask(i));
  await Promise.all(tasks);

  if (job.status !== 'cancelled') {
    job.status = 'done';
    job.percent = 100;
    console.log(`[CloudBestCore] Job ${job.id} done.`);
    setTimeout(() => jobs.delete(job.id), 24 * 60 * 60 * 1000);
  }
}

// =========================================
// 起動
// =========================================
async function startup() {
  console.log(`[Server] Loading Pokemon data...`);
  try {
    allPokemon = await loadAllPokemon((loaded, total) => {
      if (loaded % 20 === 0) console.log(`[PokemonData] ${loaded}/${total}...`);
    });
    dataReady = true;
    console.log(`[Server] Pokemon data ready: ${allPokemon.length} entries`);
  } catch (err) {
    console.error('[Server] Failed to load Pokemon data:', err);
    process.exit(1);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
    console.log(`[Server] CPU cores: ${os.cpus().length}, Workers: ${NUM_WORKERS}`);
    console.log(`[Server] Static files: ${path.join(__dirname, '..')}`);
  });
}

startup();
