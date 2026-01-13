/**
 * Webダッシュボード生成
 * 
 * スクリーニング結果をHTML形式で出力
 * GitHub Pagesで公開可能
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * HTMLレポートを生成
 */
export async function generateWebReport(results) {
    const { date, marketTrend, industryRankings, candidates } = results;

    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CANSLIM スクリーニングレポート - ${date}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #e8e8e8;
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
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
      margin-bottom: 10px;
    }
    
    header .date {
      color: #888;
      font-size: 0.9rem;
    }
    
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
    
    .status-confirmed {
      background: linear-gradient(135deg, #00c851 0%, #007e33 100%);
    }
    
    .status-pressure {
      background: linear-gradient(135deg, #ffbb33 0%, #ff8800 100%);
      color: #000;
    }
    
    .status-correction {
      background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
    }
    
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
    
    .market-detail-label {
      font-size: 0.8rem;
      color: #888;
    }
    
    .market-detail-value {
      font-size: 1.2rem;
      font-weight: bold;
    }
    
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
    
    .industry-item:hover {
      transform: translateX(5px);
    }
    
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
    
    .industry-name {
      flex: 1;
    }
    
    .industry-perf {
      font-weight: bold;
    }
    
    .industry-perf.positive {
      color: #00c851;
    }
    
    .industry-perf.negative {
      color: #ff4444;
    }
    
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
    
    .stock-header {
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .stock-header.breakout {
      background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
    }
    
    .stock-header.approaching {
      background: linear-gradient(135deg, #ffbb33 0%, #ff8800 100%);
      color: #000;
    }
    
    .stock-header.forming {
      background: linear-gradient(135deg, #00c851 0%, #007e33 100%);
    }
    
    .stock-code {
      font-size: 1.2rem;
      font-weight: bold;
    }
    
    .stock-signal {
      font-size: 0.8rem;
      padding: 4px 10px;
      background: rgba(0,0,0,0.2);
      border-radius: 10px;
    }
    
    .stock-body {
      padding: 16px;
    }
    
    .stock-name {
      font-size: 1.1rem;
      margin-bottom: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .stock-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    
    .stock-detail {
      display: flex;
      justify-content: space-between;
    }
    
    .stock-detail-label {
      color: #888;
      font-size: 0.85rem;
    }
    
    .stock-detail-value {
      font-weight: 500;
    }
    
    .stock-footer {
      padding: 12px 16px;
      border-top: 1px solid rgba(255,255,255,0.1);
      display: flex;
      justify-content: space-between;
    }
    
    .stock-link {
      color: #667eea;
      text-decoration: none;
      font-size: 0.9rem;
    }
    
    .stock-link:hover {
      text-decoration: underline;
    }
    
    /* レスポンシブ */
    @media (max-width: 600px) {
      header h1 {
        font-size: 1.5rem;
      }
      
      .section {
        padding: 16px;
      }
      
      .stock-grid {
        grid-template-columns: 1fr;
      }
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
    
    <!-- マーケット状況 -->
    <section class="section">
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
          <div class="market-detail-value">${marketTrend.details?.topix?.aboveMA50 ? '✅ 上' : '❌ 下'}</div>
        </div>
      </div>
    </section>
    
    <!-- 業種ランキング -->
    <section class="section">
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
    ${candidates.breakouts && candidates.breakouts.length > 0 ? `
    <section class="section">
      <h2 class="section-title">🔴 ブレイクアウト銘柄</h2>
      <div class="stock-grid">
        ${candidates.breakouts.map(s => createStockCard(s, 'breakout')).join('')}
      </div>
    </section>
    ` : ''}
    
    <!-- 接近中 -->
    ${candidates.approaching && candidates.approaching.length > 0 ? `
    <section class="section">
      <h2 class="section-title">🟡 ピボット接近中</h2>
      <div class="stock-grid">
        ${candidates.approaching.slice(0, 10).map(s => createStockCard(s, 'approaching')).join('')}
      </div>
    </section>
    ` : ''}
    
    <!-- 形成中 -->
    ${candidates.forming && candidates.forming.length > 0 ? `
    <section class="section">
      <h2 class="section-title">🟢 パターン形成中（ウォッチリスト）</h2>
      <div class="stock-grid">
        ${candidates.forming.slice(0, 10).map(s => createStockCard(s, 'forming')).join('')}
      </div>
    </section>
    ` : ''}
    
    <footer>
      <p>⚠️ このレポートは投資助言ではありません。投資判断は自己責任でお願いします。</p>
      <p>CANSLIM C/A/I要素は手動で確認してください。</p>
    </footer>
  </div>
</body>
</html>`;

    return html;
}

function createStockCard(stock, type) {
    return `
    <div class="stock-card">
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

    // 日付付きでも保存
    const datePath = path.join(docsDir, `report_${results.date}.html`);
    await fs.writeFile(datePath, html);

    console.log(`🌐 Webレポート保存: ${indexPath}`);

    return indexPath;
}
