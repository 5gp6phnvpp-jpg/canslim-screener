/**
 * 毎日自動分析スクリプト
 * GitHub Actionsから実行される
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const WATCHLIST_PATH = path.join(__dirname, '../docs/data/watchlist.json');
const RESULTS_PATH = path.join(__dirname, '../docs/data/analysis-results.json');

async function fetchStockData(ticker) {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${ticker}&outputsize=full&apikey=${API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data['Error Message'] || data['Note']) {
            console.log(`API Error for ${ticker}:`, data['Error Message'] || data['Note']);
            return null;
        }

        const timeSeries = data['Time Series (Daily)'];
        if (!timeSeries) {
            console.log(`No data for ${ticker}`);
            return null;
        }

        return Object.entries(timeSeries).map(([date, values]) => ({
            date,
            open: parseFloat(values['1. open']),
            high: parseFloat(values['2. high']),
            low: parseFloat(values['3. low']),
            close: parseFloat(values['4. close']),
            volume: parseInt(values['5. volume'])
        })).reverse();
    } catch (error) {
        console.error(`Error fetching ${ticker}:`, error);
        return null;
    }
}

function calculateEMA(data, period) {
    const k = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((s, v) => s + v, 0) / period;
    const result = [ema];

    for (let i = period; i < data.length; i++) {
        ema = data[i] * k + ema * (1 - k);
        result.push(ema);
    }

    return result;
}

function analyzeStock(quotes) {
    if (!quotes || quotes.length < 200) return null;

    const current = quotes[quotes.length - 1];
    const closes = quotes.map(q => q.close);

    // 移動平均
    const ma50 = closes.slice(-50).reduce((s, v) => s + v, 0) / 50;
    const ma150 = closes.slice(-150).reduce((s, v) => s + v, 0) / 150;
    const ma200 = closes.slice(-200).reduce((s, v) => s + v, 0) / 200;

    // 52週高値安値
    const high52Week = Math.max(...quotes.slice(-252).map(q => q.high));
    const low52Week = Math.min(...quotes.slice(-252).map(q => q.low));

    // RS Rating（簡易計算）
    const change6m = quotes.length >= 126 ?
        ((current.close - quotes[quotes.length - 126].close) / quotes[quotes.length - 126].close) * 100 : 0;
    const change3m = quotes.length >= 63 ?
        ((current.close - quotes[quotes.length - 63].close) / quotes[quotes.length - 63].close) * 100 : 0;
    const rsRating = (change6m * 0.4 + change3m * 0.6);

    // Minervini条件チェック
    const conditions = [
        current.close > ma50,
        current.close > ma150,
        current.close > ma200,
        ma50 > ma150,
        ma150 > ma200,
        current.close >= low52Week * 1.25
    ];

    const passCount = conditions.filter(Boolean).length;

    // ステージ判定
    let stage = 1;
    if (passCount >= 5 && current.close > ma200) stage = 2;
    else if (current.close < ma50 && ma50 < ma150) stage = 4;
    else if (current.close < ma200) stage = 4;
    else if (ma50 < ma200) stage = 3;

    // Buy Zone判定
    const pivotPoint = Math.max(...quotes.slice(-25).map(q => q.high));
    const distanceFromPivot = ((current.close - pivotPoint) / pivotPoint) * 100;
    const isInBuyZone = distanceFromPivot >= -2 && distanceFromPivot <= 5;

    // リスクリワード比
    const stopLoss = pivotPoint * 0.93;
    const target20 = pivotPoint * 1.20;
    const risk = current.close - stopLoss;
    const reward = target20 - current.close;
    const rrRatio = risk > 0 ? (reward / risk).toFixed(2) : 0;

    return {
        price: current.close,
        date: current.date,
        rsRating: Math.round(rsRating * 10) / 10,
        stage,
        passCount,
        isInBuyZone,
        rrRatio: parseFloat(rrRatio),
        fromHigh52: ((current.close - high52Week) / high52Week * 100).toFixed(1),
        fromLow52: ((current.close - low52Week) / low52Week * 100).toFixed(1),
        ma50,
        ma150,
        ma200
    };
}

async function main() {
    console.log('Starting daily analysis...');

    if (!API_KEY) {
        console.error('ALPHA_VANTAGE_API_KEY is not set!');
        process.exit(1);
    }

    // ウォッチリスト読み込み
    let watchlist;
    try {
        const watchlistData = JSON.parse(fs.readFileSync(WATCHLIST_PATH, 'utf8'));
        watchlist = watchlistData.watchlist;
    } catch (error) {
        console.error('Failed to read watchlist:', error);
        process.exit(1);
    }

    console.log(`Analyzing ${watchlist.length} stocks...`);

    const results = [];

    for (let i = 0; i < watchlist.length; i++) {
        const ticker = watchlist[i];
        console.log(`[${i + 1}/${watchlist.length}] Analyzing ${ticker}...`);

        const quotes = await fetchStockData(ticker);

        if (quotes) {
            const analysis = analyzeStock(quotes);
            if (analysis) {
                results.push({
                    ticker,
                    success: true,
                    ...analysis
                });
                console.log(`  ✓ ${ticker}: Stage ${analysis.stage}, RS ${analysis.rsRating}%`);
            } else {
                results.push({ ticker, success: false, error: 'Analysis failed' });
                console.log(`  ✗ ${ticker}: Analysis failed`);
            }
        } else {
            results.push({ ticker, success: false, error: 'Data fetch failed' });
            console.log(`  ✗ ${ticker}: Data fetch failed`);
        }

        // APIレート制限（12秒待機）
        if (i < watchlist.length - 1) {
            console.log('  Waiting 12 seconds...');
            await new Promise(resolve => setTimeout(resolve, 12000));
        }
    }

    // 結果を保存
    const outputData = {
        timestamp: new Date().toISOString(),
        results: results.sort((a, b) => {
            const scoreA = (a.passCount || 0) * 2 + (a.isInBuyZone ? 5 : 0) + (a.rsRating >= 80 ? 2 : 0);
            const scoreB = (b.passCount || 0) * 2 + (b.isInBuyZone ? 5 : 0) + (b.rsRating >= 80 ? 2 : 0);
            return scoreB - scoreA;
        })
    };

    // ディレクトリがなければ作成
    const resultsDir = path.dirname(RESULTS_PATH);
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    fs.writeFileSync(RESULTS_PATH, JSON.stringify(outputData, null, 2));

    console.log(`\n✅ Analysis complete! ${results.filter(r => r.success).length}/${results.length} successful`);
    console.log(`Results saved to ${RESULTS_PATH}`);
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
