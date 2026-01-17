/**
 * Webダッシュボード生成（拡張版）
 * 
 * スクリーニング結果をHTML形式で出力
 * GitHub Pagesで公開可能
 * 
 * 機能:
 * - マーケット状況
 * - 業種ランキング
 * - ブレイクアウト/接近中/形成中銘柄
 * - 優良銘柄ランキングTOP20
 * - RSランキング
 * - 出来高急増ランキング
 * - 決算カレンダー（1週間以内）
 * - 業種別フィルター
 * - 過去レポートアーカイブ
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * HTMLレポートを生成
 */
export async function generateWebReport(results) {
  const { date, marketTrend, industryRankings, candidates } = results;

  // RSランキング（相対強度順）
  const rsRanking = [...candidates.all]
    .filter(c => c.analysis?.leader?.stockRS != null)
    .sort((a, b) => (b.analysis?.leader?.stockRS || 0) - (a.analysis?.leader?.stockRS || 0))
    .slice(0, 20);

  // 出来高急増ランキング（150%以上）
  const volumeSurgeRanking = [...candidates.all]
    .filter(c => c.volumeRatio >= 1.5)
    .sort((a, b) => b.volumeRatio - a.volumeRatio)
    .slice(0, 20);

  // 決算1週間以内の銘柄
  const earningsWarnings = candidates.all.filter(c =>
    c.earningsRisk === 'HIGH' || c.earningsRisk === 'MEDIUM'
  );

  // 業種リスト（フィルター用）
  const industries = [...new Set(candidates.all.map(c => c.industry).filter(Boolean))].sort();

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CANSLIM スクリーニングレポート - ${date}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    :root {
      --primary: #4f46e5;
      --primary-light: #818cf8;
      --primary-dark: #3730a3;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --bg-primary: #f8fafc;
      --bg-secondary: #ffffff;
      --bg-accent: #f1f5f9;
      --text-primary: #1e293b;
      --text-secondary: #64748b;
      --text-muted: #94a3b8;
      --border: #e2e8f0;
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
      --shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
      --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1);
    }
    
    body {
      font-family: 'Inter', 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      padding: 20px;
      line-height: 1.6;
    }
    
    .container { max-width: 1400px; margin: 0 auto; }
    
    header {
      text-align: center;
      padding: 40px 0;
      margin-bottom: 30px;
    }
    
    header h1 {
      font-size: 2.2rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 12px;
      letter-spacing: -0.025em;
    }
    
    header .date { 
      color: var(--text-secondary); 
      font-size: 0.95rem;
      font-weight: 500;
    }
    
    /* ナビゲーションタブ */
    .nav-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      flex-wrap: wrap;
      justify-content: center;
      background: var(--bg-secondary);
      padding: 8px;
      border-radius: 16px;
      box-shadow: var(--shadow);
    }
    
    .nav-tab {
      padding: 12px 24px;
      background: transparent;
      border: none;
      border-radius: 12px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.9rem;
      font-weight: 500;
    }
    
    .nav-tab:hover {
      background: var(--bg-accent);
      color: var(--text-primary);
    }
    
    .nav-tab.active {
      background: var(--primary);
      color: white;
    }
    
    /* 業種フィルター */
    .filter-container {
      background: var(--bg-secondary);
      border-radius: 16px;
      padding: 16px 24px;
      margin-bottom: 24px;
      display: flex;
      gap: 20px;
      align-items: center;
      flex-wrap: wrap;
      box-shadow: var(--shadow);
    }
    
    .filter-label { 
      font-weight: 600;
      color: var(--text-primary);
    }
    
    .filter-select {
      padding: 10px 16px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--bg-secondary);
      color: var(--text-primary);
      font-size: 0.9rem;
      font-family: inherit;
      cursor: pointer;
      transition: border-color 0.2s;
    }
    
    .filter-select:focus {
      outline: none;
      border-color: var(--primary);
    }
    
    .filter-select option { background: var(--bg-secondary); }
    
    .section {
      background: var(--bg-secondary);
      border-radius: 16px;
      padding: 28px;
      margin-bottom: 24px;
      box-shadow: var(--shadow);
      border: 1px solid var(--border);
    }
    
    .section-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--text-primary);
    }
    
    .section-subtitle {
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-bottom: 16px;
    }
    
    /* マーケット状況 */
    .market-status {
      display: flex;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    
    .status-badge {
      padding: 10px 24px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 1rem;
      color: white;
    }
    
    .status-confirmed { background: linear-gradient(135deg, var(--success) 0%, #059669 100%); }
    .status-pressure { background: linear-gradient(135deg, var(--warning) 0%, #d97706 100%); }
    .status-correction { background: linear-gradient(135deg, var(--danger) 0%, #dc2626 100%); }
    .status-neutral { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); }
    
    .market-details {
      display: flex;
      gap: 16px;
      margin-top: 20px;
      flex-wrap: wrap;
    }
    
    .market-detail {
      background: var(--bg-accent);
      padding: 16px 24px;
      border-radius: 12px;
      border: 1px solid var(--border);
    }
    
    .market-detail-label { font-size: 0.8rem; color: var(--text-muted); }
    .market-detail-value { font-size: 1.3rem; font-weight: 600; color: var(--text-primary); }
    
    /* 業種ランキング */
    .industry-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
    }
    
    .industry-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 18px;
      background: var(--bg-accent);
      border-radius: 12px;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }
    
    .industry-item:hover { 
      transform: translateX(4px);
      border-color: var(--primary-light);
      background: white;
    }
    
    .industry-rank {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-right: 14px;
      color: white;
    }
    
    .industry-name { flex: 1; font-weight: 500; color: var(--text-primary); }
    .industry-perf { font-weight: 600; margin-left: 8px; }
    .industry-perf.positive { color: var(--success); }
    .industry-perf.negative { color: var(--danger); }
    
    /* 銘柄カード */
    .stock-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }
    
    .stock-card {
      background: var(--bg-secondary);
      border-radius: 16px;
      overflow: hidden;
      transition: all 0.2s ease;
      border: 1px solid var(--border);
    }
    
    .stock-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-lg);
      border-color: var(--primary-light);
    }
    
    .stock-card.hidden { display: none; }
    
    .stock-header {
      padding: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: white;
    }
    
    .stock-header.breakout { background: linear-gradient(135deg, var(--danger) 0%, #dc2626 100%); }
    .stock-header.approaching { background: linear-gradient(135deg, var(--warning) 0%, #d97706 100%); }
    .stock-header.forming { background: linear-gradient(135deg, var(--success) 0%, #059669 100%); }
    .stock-header.volume-surge { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }
    .stock-header.rs-leader { background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); }
    
    .stock-code { font-size: 1.25rem; font-weight: 700; }
    .stock-signal { font-size: 0.8rem; padding: 6px 12px; background: rgba(255,255,255,0.2); border-radius: 8px; font-weight: 500; }
    
    .stock-body { padding: 20px; }
    .stock-name { font-size: 1.1rem; font-weight: 600; margin-bottom: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary); }
    
    .stock-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .stock-detail { display: flex; justify-content: space-between; padding: 4px 0; }
    .stock-detail-label { color: var(--text-muted); font-size: 0.85rem; }
    .stock-detail-value { font-weight: 500; color: var(--text-primary); }
    
    .stock-footer {
      padding: 14px 20px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      background: var(--bg-accent);
    }
    
    .stock-link { 
      color: var(--primary); 
      text-decoration: none; 
      font-size: 0.9rem;
      font-weight: 500;
      transition: color 0.2s;
    }
    .stock-link:hover { 
      color: var(--primary-dark);
      text-decoration: underline; 
    }
    
    /* 決算カレンダー */
    .earnings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
    }
    
    .earnings-item {
      padding: 14px 18px;
      background: #fef2f2;
      border-radius: 12px;
      border-left: 4px solid var(--danger);
    }
    
    .earnings-item.medium { 
      border-left-color: var(--warning); 
      background: #fffbeb; 
    }
    
    .earnings-code { font-weight: 600; font-size: 1.1rem; color: var(--text-primary); }
    .earnings-name { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 4px; }
    .earnings-date { color: var(--danger); font-weight: 500; }
    .earnings-item.medium .earnings-date { color: var(--warning); }
    
    /* アーカイブ */
    .archive-list {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    
    .archive-link {
      padding: 10px 18px;
      background: var(--bg-accent);
      border-radius: 10px;
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
      border: 1px solid var(--border);
      transition: all 0.2s;
    }
    
    .archive-link:hover { 
      background: white;
      border-color: var(--primary);
    }
    
    /* テーブル */
    .ranking-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .ranking-table th, .ranking-table td {
      padding: 14px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    
    .ranking-table th {
      background: var(--bg-accent);
      font-weight: 600;
      color: var(--text-secondary);
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .ranking-table tr:hover { background: var(--bg-accent); }
    
    /* レスポンシブ */
    @media (max-width: 600px) {
      header h1 { font-size: 1.6rem; }
      .section { padding: 20px; }
      .stock-grid { grid-template-columns: 1fr; }
      .nav-tabs { justify-content: flex-start; overflow-x: auto; padding: 6px; }
      .market-details { flex-direction: column; }
    }
    
    footer {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-muted);
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📊 CANSLIM スクリーニングレポート</h1>
      <p class="date">更新日時: ${date} ${new Date().toLocaleTimeString('ja-JP')}</p>
      <div style="margin-top: 16px;">
        <a href="us-analyzer.html" class="archive-link" style="display: inline-block;">🇺🇸 米国株分析ツール</a>
      </div>
    </header>
    
    <!-- ナビゲーションタブ -->
    <div class="nav-tabs">
      <button class="nav-tab active" onclick="showSection('all')">📋 すべて</button>
      <button class="nav-tab" onclick="showSection('breakouts')">🔴 ブレイクアウト</button>
      <button class="nav-tab" onclick="showSection('rs')">💪 RSランキング</button>
      <button class="nav-tab" onclick="showSection('volume')">📈 出来高急増</button>
      <button class="nav-tab" onclick="showSection('earnings')">📅 決算カレンダー</button>
    </div>
    
    <!-- 業種フィルター -->
    <div class="filter-container">
      <span class="filter-label">🏭 業種フィルター:</span>
      <select class="filter-select" id="industryFilter" onchange="filterByIndustry()">
        <option value="">すべての業種</option>
        ${industries.map(i => `<option value="${i}">${i}</option>`).join('')}
      </select>
      <span class="filter-label">📊 サマリー:</span>
      <span>分析: ${candidates.all.length}銘柄 / ブレイク: ${candidates.breakouts.length} / 接近: ${candidates.approaching.length} / 形成: ${candidates.forming.length}</span>
    </div>
    
    <!-- マーケット状況 -->
    <section class="section" id="section-market">
      <h2 class="section-title">🚦 マーケット状況</h2>
      <div class="market-status">
        <span class="status-badge status-${marketTrend.status.toLowerCase().replace('_', '-')}">
          ${marketTrend.status}
        </span>
        <span>${marketTrend.message}</span>
      </div>
      <div class="market-details">
        <div class="market-detail">
          <div class="market-detail-label">ディストリビューションデイ</div>
          <div class="market-detail-value">${marketTrend.details?.distributionDays || 0}日</div>
        </div>
        <div class="market-detail">
          <div class="market-detail-label">TOPIX vs 50日MA</div>
          <div class="market-detail-value">${marketTrend.details?.topix?.aboveMA50 ? '✅ 上' : (marketTrend.details?.dataUnavailable ? '⚪ N/A' : '❌ 下')}</div>
        </div>
        ${marketTrend.details?.topix?.distanceFromMA50 ? `
        <div class="market-detail">
          <div class="market-detail-label">50日MAからの乖離</div>
          <div class="market-detail-value">${marketTrend.details.topix.distanceFromMA50 > 0 ? '+' : ''}${marketTrend.details.topix.distanceFromMA50}%</div>
        </div>
        ` : ''}
      </div>
    </section>
    
    <!-- 業種ランキング -->
    <section class="section" id="section-industry">
      <h2 class="section-title">📈 業種RSランキングTOP20（IBD方式）</h2>
      <p class="section-subtitle">過去6ヶ月（126日）のパフォーマンスでランキング。RS Rating 80以上がTOP20%。</p>
      <div class="industry-grid">
        ${industryRankings.slice(0, 20).map(r => `
          <div class="industry-item">
            <span class="industry-rank">${r.rank}</span>
            <span class="industry-name">${r.industry}</span>
            <span class="industry-rs" style="color: ${(r.rsRating || 0) >= 80 ? '#00c851' : '#888'}; font-weight: ${(r.rsRating || 0) >= 80 ? 'bold' : 'normal'};">
              RS:${r.rsRating || 0}
            </span>
            <span class="industry-perf ${r.performance >= 0 ? 'positive' : 'negative'}">
              ${r.performance >= 0 ? '+' : ''}${r.performance}%
            </span>
          </div>
        `).join('')}
      </div>
    </section>
    
    <!-- ブレイクアウト銘柄 -->
    <section class="section" id="section-breakouts">
      <h2 class="section-title">🔴 ブレイクアウト銘柄（${candidates.breakouts.length}銘柄）</h2>
      <p class="section-subtitle">52週新高値更新 + 出来高150%以上の銘柄</p>
      ${candidates.breakouts.length > 0 ? `
      <div class="stock-grid">
        ${candidates.breakouts.map(s => createStockCard(s, 'breakout')).join('')}
      </div>
      ` : '<p style="color: #888;">該当銘柄なし</p>'}
    </section>
    
    <!-- 新高値接近中 -->
    <section class="section" id="section-approaching">
      <h2 class="section-title">🟡 新高値更新中（${candidates.approaching.length}銘柄）</h2>
      <p class="section-subtitle">52週新高値を更新したが出来高未確認の銘柄</p>
      ${candidates.approaching.length > 0 ? `
      <div class="stock-grid">
        ${candidates.approaching.slice(0, 12).map(s => createStockCard(s, 'approaching')).join('')}
      </div>
      ` : '<p style="color: #888;">該当銘柄なし</p>'}
    </section>
    
    <!-- パターン形成中 -->
    <section class="section" id="section-forming">
      <h2 class="section-title">🟢 新高値接近中（${candidates.forming.length}銘柄）</h2>
      <p class="section-subtitle">新高値まで3%以内の銘柄</p>
      ${candidates.forming.length > 0 ? `
      <div class="stock-grid">
        ${candidates.forming.slice(0, 12).map(s => createStockCard(s, 'forming')).join('')}
      </div>
      ` : '<p style="color: #888;">該当銘柄なし</p>'}
    </section>
    
    <!-- RSランキング -->
    <section class="section" id="section-rs">
      <h2 class="section-title">💪 RSランキングTOP20（相対強度順）</h2>
      <p class="section-subtitle">過去の株価上昇率が高い銘柄（モメンタム指標）</p>
      ${rsRanking.length > 0 ? `
      <table class="ranking-table">
        <thead>
          <tr>
            <th>#</th>
            <th>コード</th>
            <th>銘柄名</th>
            <th>業種</th>
            <th>RS</th>
            <th>現在値</th>
            <th>リンク</th>
          </tr>
        </thead>
        <tbody>
          ${rsRanking.map((s, i) => `
          <tr data-industry="${s.industry}">
            <td>${i + 1}</td>
            <td><strong>${s.code}</strong></td>
            <td>${s.name}</td>
            <td>${s.industry || '-'}</td>
            <td style="color: ${(s.analysis?.leader?.stockRS || 0) >= 0 ? '#00c851' : '#ff4444'}">
              ${(s.analysis?.leader?.stockRS || 0) >= 0 ? '+' : ''}${(s.analysis?.leader?.stockRS || 0).toFixed(1)}%
            </td>
            <td>¥${s.currentPrice?.toLocaleString() || '-'}</td>
            <td>
              <a href="https://kabutan.jp/stock/?code=${s.code}" target="_blank" class="stock-link">株探</a>
            </td>
          </tr>
          `).join('')}
        </tbody>
      </table>
      ` : '<p style="color: #888;">該当銘柄なし</p>'}
    </section>
    
    <!-- 出来高急増ランキング -->
    <section class="section" id="section-volume">
      <h2 class="section-title">📈 出来高急増ランキング（150%以上）</h2>
      <p class="section-subtitle">出来高が50日平均の150%以上の銘柄</p>
      ${volumeSurgeRanking.length > 0 ? `
      <table class="ranking-table">
        <thead>
          <tr>
            <th>#</th>
            <th>コード</th>
            <th>銘柄名</th>
            <th>業種</th>
            <th>出来高比</th>
            <th>現在値</th>
            <th>シグナル</th>
            <th>リンク</th>
          </tr>
        </thead>
        <tbody>
          ${volumeSurgeRanking.map((s, i) => `
          <tr data-industry="${s.industry}">
            <td>${i + 1}</td>
            <td><strong>${s.code}</strong></td>
            <td>${s.name}</td>
            <td>${s.industry || '-'}</td>
            <td style="color: #9b59b6; font-weight: bold;">${Math.round(s.volumeRatio * 100)}%</td>
            <td>¥${s.currentPrice?.toLocaleString() || '-'}</td>
            <td>${s.signalMessage}</td>
            <td>
              <a href="https://kabutan.jp/stock/?code=${s.code}" target="_blank" class="stock-link">株探</a>
            </td>
          </tr>
          `).join('')}
        </tbody>
      </table>
      ` : '<p style="color: #888;">出来高急増銘柄なし</p>'}
    </section>
    
    <!-- 決算カレンダー -->
    <section class="section" id="section-earnings">
      <h2 class="section-title">📅 決算カレンダー（1週間以内）</h2>
      <p class="section-subtitle">決算発表を控えている銘柄（エントリー注意）</p>
      ${earningsWarnings.length > 0 ? `
      <div class="earnings-grid">
        ${earningsWarnings.map(s => `
          <div class="earnings-item ${s.earningsRisk === 'MEDIUM' ? 'medium' : ''}">
            <div class="earnings-code">${s.code}</div>
            <div class="earnings-name">${s.name}</div>
            <div class="earnings-date">${s.earningsMessage}</div>
          </div>
        `).join('')}
      </div>
      ` : '<p style="color: #888;">1週間以内に決算がある銘柄はありません ✅</p>'}
    </section>
    
    <!-- 優良銘柄ランキング -->
    <section class="section" id="section-all">
      <h2 class="section-title">⭐ 優良銘柄ランキング TOP20（スコア順）</h2>
      <p class="section-subtitle">CANSLIM M/S/N/L要素を総合評価（S:20点 + N:25点 + L:25点 + パターン:30点 - 決算リスク）</p>
      ${candidates.all.length > 0 ? `
      <table class="ranking-table">
        <thead>
          <tr>
            <th>#</th>
            <th>スコア</th>
            <th>コード</th>
            <th>銘柄名</th>
            <th>業種</th>
            <th>シグナル</th>
            <th>現在値</th>
            <th>RS</th>
            <th>出来高比</th>
            <th>リンク</th>
          </tr>
        </thead>
        <tbody>
          ${[...candidates.all].sort((a, b) => b.score - a.score).slice(0, 20).map((s, i) => `
          <tr data-industry="${s.industry || ''}">
            <td>${i + 1}</td>
            <td style="font-weight: bold; color: ${s.score >= 70 ? '#00c851' : s.score >= 50 ? '#ffbb33' : '#888'}; font-size: 1.1rem;">
              ${s.score}点
            </td>
            <td><strong>${s.code}</strong></td>
            <td>${s.name}</td>
            <td>${s.industry || '-'}</td>
            <td style="color: ${s.signal === 'BREAKOUT' ? '#ff4444' : s.signal === 'APPROACHING' ? '#ffbb33' : '#00c851'}">
              ${s.signalMessage}
            </td>
            <td>¥${s.currentPrice?.toLocaleString() || '-'}</td>
            <td style="color: ${(s.analysis?.leader?.stockRS || 0) >= 0 ? '#00c851' : '#ff4444'}">
              ${(s.analysis?.leader?.stockRS || 0) >= 0 ? '+' : ''}${(s.analysis?.leader?.stockRS || 0).toFixed(1)}%
            </td>
            <td>${s.volumeRatio ? Math.round(s.volumeRatio * 100) + '%' : '-'}</td>
            <td>
              <a href="https://kabutan.jp/stock/?code=${s.code}" target="_blank" class="stock-link">株探</a>
            </td>
          </tr>
          `).join('')}
        </tbody>
      </table>
      ` : '<p style="color: #888;">該当銘柄なし</p>'}
    </section>
    
    <footer>
      <p>⚠️ このレポートは投資助言ではありません。投資判断は自己責任でお願いします。</p>
      <p>CANSLIM C/A/I要素は手動で確認してください。</p>
      <p style="margin-top: 10px; font-size: 0.75rem;">Generated by CANSLIM Stock Screener</p>
    </footer>
  </div>
  
  <script>
    // セクション表示切り替え
    function showSection(section) {
      // タブのアクティブ状態を更新
      document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
      event.target.classList.add('active');
      
      // 全セクションを表示
      const sections = ['market', 'industry', 'breakouts', 'approaching', 'forming', 'rs', 'volume', 'earnings', 'all'];
      
      if (section === 'all') {
        sections.forEach(s => {
          const el = document.getElementById('section-' + s);
          if (el) el.style.display = 'block';
        });
      } else {
        sections.forEach(s => {
          const el = document.getElementById('section-' + s);
          if (el) {
            if (s === section || s === 'market') {
              el.style.display = 'block';
            } else {
              el.style.display = 'none';
            }
          }
        });
      }
    }
    
    // 業種フィルター
    function filterByIndustry() {
      const selected = document.getElementById('industryFilter').value;
      
      // 銘柄カードのフィルター
      document.querySelectorAll('.stock-card').forEach(card => {
        const industry = card.dataset.industry;
        if (!selected || industry === selected) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
      
      // テーブル行のフィルター
      document.querySelectorAll('.ranking-table tbody tr').forEach(row => {
        const industry = row.dataset.industry;
        if (!selected || industry === selected) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }
  </script>
</body>
</html>`;

  return html;
}

function createStockCard(stock, type) {
  const pattern = stock.analysis?.pattern;
  const isVCP = pattern?.pattern === 'VCP';
  const vcpScore = pattern?.qualityScore;
  const leader = stock.analysis?.leader;
  const industryRS = leader?.industryRSRating || 0;
  const stockRS = leader?.stockRSRating || 0;
  const isLeader = leader?.isLeader;

  return `
    <div class="stock-card" data-industry="${stock.industry || ''}">
      <div class="stock-header ${type}">
        <span class="stock-code">${stock.code}</span>
        <span style="display: flex; gap: 4px; align-items: center;">
          ${isVCP ? `<span style="background: #764ba2; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem;">VCP</span>` : ''}
          ${isLeader ? `<span style="background: #00c851; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem;">🏆リーダー</span>` : ''}
          <span class="stock-signal">${stock.signalMessage || stock.signal}</span>
        </span>
      </div>
      <div class="stock-body">
        <div class="stock-name">${stock.name}</div>
        <div class="stock-details">
          <div class="stock-detail">
            <span class="stock-detail-label">現在値</span>
            <span class="stock-detail-value">¥${stock.currentPrice?.toLocaleString() || '-'}</span>
          </div>
          <div class="stock-detail">
            <span class="stock-detail-label">ピボット</span>
            <span class="stock-detail-value">¥${stock.pivotPrice?.toLocaleString() || '-'}</span>
          </div>
          <div class="stock-detail">
            <span class="stock-detail-label">出来高</span>
            <span class="stock-detail-value">${stock.volumeRatio ? Math.round(stock.volumeRatio * 100) + '%' : '-'}</span>
          </div>
          <div class="stock-detail">
            <span class="stock-detail-label">業種</span>
            <span class="stock-detail-value">${stock.industry || '-'}</span>
          </div>
          <div class="stock-detail">
            <span class="stock-detail-label">業種RS</span>
            <span class="stock-detail-value" style="color: ${industryRS >= 80 ? '#00c851' : (industryRS >= 60 ? '#ffbb33' : '#888')}">
              ${industryRS}
            </span>
          </div>
          <div class="stock-detail">
            <span class="stock-detail-label">銘柄RS</span>
            <span class="stock-detail-value" style="color: ${stockRS >= 80 ? '#00c851' : (stockRS >= 60 ? '#ffbb33' : '#888')}">
              ${stockRS}
            </span>
          </div>
          ${isVCP && vcpScore != null ? `
          <div class="stock-detail">
            <span class="stock-detail-label">VCP品質</span>
            <span class="stock-detail-value" style="color: ${vcpScore >= 60 ? '#00c851' : (vcpScore >= 40 ? '#ffbb33' : '#888')}">
              ${vcpScore}点
            </span>
          </div>
          ` : ''}
          <div class="stock-detail">
            <span class="stock-detail-label">新高値まで</span>
            <span class="stock-detail-value">${stock.distanceToPivot != null ? stock.distanceToPivot.toFixed(1) + '%' : '-'}</span>
          </div>
        </div>
      </div>
      <div class="stock-footer">
        <a href="https://www.tradingview.com/symbols/TSE-${stock.code}/" target="_blank" class="stock-link">
          📈 TradingView
        </a>
        <a href="https://kabutan.jp/stock/?code=${stock.code}" target="_blank" class="stock-link">
          📊 株探
        </a>
      </div>
    </div>
  `;
}

/**
 * レポートを保存
 */
export async function saveWebReport(results) {
  const html = await generateWebReport(results);

  const docsDir = path.join(process.cwd(), 'docs');
  await fs.mkdir(docsDir, { recursive: true });

  // 最新版をindex.htmlとして保存
  const indexPath = path.join(docsDir, 'index.html');
  await fs.writeFile(indexPath, html);

  // 日付付きでも保存（アーカイブ用）
  const datePath = path.join(docsDir, `report_${results.date}.html`);
  await fs.writeFile(datePath, html);

  console.log(`🌐 Webレポート保存: ${indexPath}`);

  return indexPath;
}
