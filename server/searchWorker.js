// ==========================================
// searchWorker.js — Worker Thread 本体
// searchPool の担当範囲を探索し、結果をメインスレッドに返す
// ==========================================

'use strict';

const { parentPort, workerData } = require('worker_threads');
const { recommendTeamSync } = require('./teamAnalyzer.node');

const {
  initialTeam, allPokemon, mode, slotsToFill, options,
  workerId, numWorkers
} = workerData;

// 進捗報告
function onProgress(stats) {
  parentPort.postMessage({ type: 'progress', workerId, ...stats });
}

try {
  const result = recommendTeamSync({
    initialTeam, allPokemon, mode, slotsToFill, options,
    workerId, numWorkers,
    onProgress
  });

  parentPort.postMessage({
    type: 'done',
    workerId,
    patterns: result.patterns,
    stats: result.stats
  });
} catch (err) {
  parentPort.postMessage({
    type: 'error',
    workerId,
    error: err.message || String(err)
  });
}
