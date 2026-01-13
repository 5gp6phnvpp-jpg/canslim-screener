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
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #e8e8e8;
      min-height: 100vh;
      padding: 20px;
    }
    
    .container { max-width: 1400px; margin: 0 auto; }
    
    header {
      text-align: center;
      padding: 30px 0;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      margin-bottom: 30px;
    }
    
    header h1 {
      font-size: 2rem;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 10px;
    }
    
    header .date { color: #888; font-size: 0.9rem; }
    
    /* ナビゲーションタブ */
    .nav-tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 24px;
      flex-wrap: wrap;
      justify-content: center;
    }
    
    .nav-tab {
      padding: 10px 20px;
      background: rgba(255,255,255,0.1);
      border: none;
      border-radius: 20px;
      color: #e8e8e8;
      cursor: pointer;
      transition: all 0.3s;
      font-size: 0.9rem;
    }
    
    .nav-tab:hover, .nav-tab.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    
    /* 業種フィルター */
    .filter-container {
      background: rgba(255,255,255,0.05);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
    }
    
    .filter-label { font-weight: bold; }
    
    .filter-select {
      padding: 8px 16px;
      border-radius: 8px;
      border: none;
      background: rgba(255,255,255,0.1);
      color: #e8e8e8;
      font-size: 0.9rem;
    }
    
    .filter-select option { background: #1a1a2e; }
    
    .section {
      background: rgba(255,255,255,0.05);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      backdrop-filter: blur(10px);
    }
    
    .section-title {
      font-size: 1.2rem;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .section-subtitle {
      font-size: 0.85rem;
      color: #888;
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
      padding: 8px 20px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 1.1rem;
    }
    
    .status-confirmed { background: linear-gradient(135deg, #00c851 0%, #007e33 100%); }
    .status-pressure { background: linear-gradient(135deg, #ffbb33 0%, #ff8800 100%); color: #000; }
    .status-correction { background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%); }
    .status-neutral { background: linear-gradient(135deg, #888 0%, #666 100%); }
    
    .market-details {
      display: flex;
      gap: 30px;
      margin-top: 16px;
      flex-wrap: wrap;
    }
    
    .market-detail {
      background: rgba(255,255,255,0.05);
      padding: 12px 20px;
      border-radius: 10px;
    }
    
    .market-detail-label { font-size: 0.8rem; color: #888; }
    .market-detail-value { font-size: 1.2rem; font-weight: bold; }
    
    /* 業種ランキング */
    .industry-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 12px;
    }
    
    .industry-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: rgba(255,255,255,0.05);
      border-radius: 10px;
      transition: transform 0.2s;
    }
    
    .industry-item:hover { transform: translateX(5px); }
    
    .industry-rank {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      font-size: 0.8rem;
      font-weight: bold;
      margin-right: 12px;
    }
    
    .industry-name { flex: 1; }
    .industry-perf { font-weight: bold; }
    .industry-perf.positive { color: #00c851; }
    .industry-perf.negative { color: #ff4444; }
    
    /* 銘柄カード */
    .stock-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
    
    .stock-card {
      background: rgba(255,255,255,0.08);
      border-radius: 12px;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .stock-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    
    .stock-card.hidden { display: none; }
    
    .stock-header {
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .stock-header.breakout { background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%); }
    .stock-header.approaching { background: linear-gradient(135deg, #ffbb33 0%, #ff8800 100%); color: #000; }
    .stock-header.forming { background: linear-gradient(135deg, #00c851 0%, #007e33 100%); }
    .stock-header.volume-surge { background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%); }
    .stock-header.rs-leader { background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); }
    
    .stock-code { font-size: 1.2rem; font-weight: bold; }
    .stock-signal { font-size: 0.8rem; padding: 4px 10px; background: rgba(0,0,0,0.2); border-radius: 10px; }
    
    .stock-body { padding: 16px; }
    .stock-name { font-size: 1.1rem; margin-bottom: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    
    .stock-details { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .stock-detail { display: flex; justify-content: space-between; }
    .stock-detail-label { color: #888; font-size: 0.85rem; }
    .stock-detail-value { font-weight: 500; }
    
    .stock-footer {
      padding: 12px 16px;
      border-top: 1px solid rgba(255,255,255,0.1);
      display: flex;
      justify-content: space-between;
    }
    
    .stock-link { color: #667eea; text-decoration: none; font-size: 0.9rem; }
    .stock-link:hover { text-decoration: underline; }
    
    /* 決算カレンダー */
    .earnings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }
    
    .earnings-item {
      padding: 12px 16px;
      background: rgba(255,100,100,0.1);
      border-radius: 10px;
      border-left: 4px solid #ff4444;
    }
    
    .earnings-item.medium { border-left-color: #ffbb33; background: rgba(255,187,51,0.1); }
    
    .earnings-code { font-weight: bold; font-size: 1.1rem; }
    .earnings-name { font-size: 0.85rem; color: #888; margin-bottom: 4px; }
    .earnings-date { color: #ff4444; font-weight: 500; }
    .earnings-item.medium .earnings-date { color: #ffbb33; }
    
    /* アーカイブ */
    .archive-list {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    
    .archive-link {
      padding: 8px 16px;
      background: rgba(255,255,255,0.1);
      border-radius: 8px;
      color: #667eea;
      text-decoration: none;
    }
    
    .archive-link:hover { background: rgba(255,255,255,0.2); }
    
    /* テーブル */
    .ranking-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .ranking-table th, .ranking-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    
    .ranking-table th {
      background: rgba(255,255,255,0.05);
      font-weight: 600;
    }
    
    .ranking-table tr:hover { background: rgba(255,255,255,0.05); }
    
    /* レスポンシブ */
    @media (max-width: 600px) {
      header h1 { font-size: 1.5rem; }
      .section { padding: 16px; }
      .stock-grid { grid-template-columns: 1fr; }
      .nav-tabs { justify-content: flex-start; overflow-x: auto; }
    }
    
    footer {
      text-align: center;
      padding: 30px;
      color: #666;
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📊 CANSLIM スクリーニングレポート</h1>
      <p class="date">更新日時: ${date} ${new Date().toLocaleTimeString('ja-JP')}</p>
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
      <h2 class="section-title">📈 業種パフォーマンスTOP20</h2>
      <div class="industry-grid">
        ${industryRankings.slice(0, 20).map(r => `
          <div class="industry-item">
            <span class="industry-rank">${r.rank}</span>
            <span class="industry-name">${r.industry}</span>
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
      <p class="section-subtitle">CANSLIM M/S/N/L要素を総合評価</p>
      ${candidates.all.length > 0 ? `
      <div class="stock-grid">
        ${candidates.all.slice(0, 20).map(s => createStockCard(s, s.signal === 'BREAKOUT' ? 'breakout' : s.signal === 'APPROACHING' ? 'approaching' : 'forming')).join('')}
      </div>
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
  return `
    <div class="stock-card" data-industry="${stock.industry || ''}">
      <div class="stock-header ${type}">
        <span class="stock-code">${stock.code}</span>
        <span class="stock-signal">${stock.signalMessage || stock.signal}</span>
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
          ${stock.analysis?.leader?.stockRS != null ? `
          <div class="stock-detail">
            <span class="stock-detail-label">RS</span>
            <span class="stock-detail-value" style="color: ${stock.analysis.leader.stockRS >= 0 ? '#00c851' : '#ff4444'}">
              ${stock.analysis.leader.stockRS >= 0 ? '+' : ''}${stock.analysis.leader.stockRS.toFixed(1)}%
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
