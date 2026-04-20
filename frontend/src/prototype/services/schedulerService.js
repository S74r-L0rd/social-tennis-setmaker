// ============================================================
// schedulerService.js — 演算法服務層
//
// 目前：Plan A — 直接呼叫本地演算法（前端執行）
//
// 切換到後端 API（Plan B）時，只需修改此檔案：
// 將各函式的實作換成 fetch() 呼叫即可。
// 所有 React 元件和 Context 完全不用動。
// ============================================================

import { generateRound } from '../algorithm/scheduler'

/**
 * 生成一輪賽程。
 *
 * Plan B 切換方式：
 *   const res = await fetch('/api/generate-round', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ players, courts, history, config }),
 *   })
 *   return res.json()
 */
export function generateRoundService(players, courts, history, config = {}) {
  return generateRound(players, courts, history, config)
}
