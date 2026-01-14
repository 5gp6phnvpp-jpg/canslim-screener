/**
 * Yahoo Finance Japan から株価・出来高データを取得
 * 
 * yahoo-finance2 ライブラリを使用
 * 日本株のティッカーは「証券コード.T」形式（例: 7203.T）
 */

import yahooFinance from 'yahoo-finance2';
import dayjs from 'dayjs';

// yahoo-finance2 のオプション設定（v2警告抑制）
yahooFinance.setGlobalConfig({
    validation: {
        logErrors: false
    }
});

// Yahoo Finance のクォータ管理（レート制限対策）
const BATCH_SIZE = 10;        // 一度に取得する銘柄数（小さくして安全に）
const DELAY_MS = 2000;        // バッチ間の待機時間（ミリ秒）

/**
 * 単一銘柄の株価データを取得
 * @param {string} code - 証券コード（例: 7203）
 * @param {number} days - 取得する日数（デフォルト: 60営業日分 = 約90日）
 */
async function fetchSingleStock(code, days = 90) {
    const symbol = `${code}.T`;  // 東証のサフィックス

    const endDate = dayjs();
    const startDate = endDate.subtract(days, 'day');

    try {
        const result = await yahooFinance.chart(symbol, {
            period1: startDate.format('YYYY-MM-DD'),
            period2: endDate.format('YYYY-MM-DD'),
            interval: '1d'
        });

        if (!result || !result.quotes || result.quotes.length === 0) {
            return null;
        }

        const quotes = result.quotes.map(q => ({
            date: dayjs(q.date).format('YYYY-MM-DD'),
            open: q.open,
            high: q.high,
            low: q.low,
            close: q.close,
            volume: q.volume,
            adjClose: q.adjclose
        })).filter(q => q.close !== null && q.volume !== null);

        return {
            code,
            symbol,
            name: result.meta?.shortName || result.meta?.longName || '',
            currency: result.meta?.currency || 'JPY',
            quotes
        };
    } catch (error) {
        // エラーは静かに処理（存在しない銘柄等）
        return null;
    }
}

/**
 * 複数銘柄の株価データをバッチ取得
 * 
 * 優先順位（データの新鮮さを重視）:
 * 1. Yahoo Finance（最新データ、レート制限あり）
 * 2. Stooq.com（フォールバック、数日遅延の場合あり）
 * 
 * @param {Array<string>} codes - 証券コードの配列
 * @param {Function} progressCallback - 進捗コールバック
 */
export async function fetchPriceData(codes, progressCallback = null) {
    let results = [];
    const fetchedCodes = new Set();

    // ステップ1: Yahoo Financeで取得を試みる
    console.log('💹 株価データを取得中 (Yahoo Finance)...');
    const yahooResults = [];
    const totalBatches = Math.ceil(codes.length / BATCH_SIZE);

    for (let i = 0; i < codes.length; i += BATCH_SIZE) {
        const batch = codes.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;

        if (progressCallback) {
            progressCallback({
                current: batchNum,
                total: totalBatches,
                percent: Math.round((batchNum / totalBatches) * 100)
            });
        }

        // 並列で取得
        const batchResults = await Promise.all(
            batch.map(code => fetchSingleStock(code))
        );

        // 成功したものだけ追加
        for (const r of batchResults) {
            if (r !== null) {
                yahooResults.push(r);
                fetchedCodes.add(r.code);
            }
        }

        // レート制限対策で待機（Yahoo は厳しいので長めに）
        if (i + BATCH_SIZE < codes.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
    }

    console.log(`   Yahoo: ${yahooResults.length}/${codes.length}銘柄取得`);
    results = yahooResults;

    // ステップ2: Yahoo で取得できなかった銘柄を Stooq で補完
    const missingCodes = codes.filter(code => !fetchedCodes.has(code));

    if (missingCodes.length > 0) {
        console.log(`   ⚙️ Stooqで${missingCodes.length}銘柄を補完中...`);

        const { fetchPriceDataFromStooq } = await import('./fetchStooq.js');
        const stooqResults = await fetchPriceDataFromStooq(missingCodes);

        console.log(`   Stooq: ${stooqResults.length}銘柄追加取得`);
        results.push(...stooqResults);
    }

    console.log(`   ✅ 合計: ${results.length}/${codes.length}銘柄取得`);
    return results;
}

/**
 * 現在の株価を取得（リアルタイム）
 * @param {string} code - 証券コード
 */
export async function fetchCurrentPrice(code) {
    const symbol = `${code}.T`;

    try {
        const quote = await yahooFinance.quote(symbol);
        return {
            code,
            price: quote.regularMarketPrice,
            change: quote.regularMarketChange,
            changePercent: quote.regularMarketChangePercent,
            volume: quote.regularMarketVolume,
            previousClose: quote.regularMarketPreviousClose,
            open: quote.regularMarketOpen,
            high: quote.regularMarketDayHigh,
            low: quote.regularMarketDayLow,
            marketState: quote.marketState,
            time: quote.regularMarketTime
        };
    } catch (error) {
        return null;
    }
}

/**
 * 指数データを取得（TOPIX, 日経225）
 * 
 * 優先順位:
 * 1. Stooq.com（レート制限が緩い）
 * 2. Yahoo Finance（フォールバック）
 */
export async function fetchIndexData() {
    // まずStooqを試す
    const { fetchIndexDataFromStooq } = await import('./fetchStooq.js');

    console.log('📊 指数データを取得中...');

    let results = await fetchIndexDataFromStooq();

    // Stooqで取得できた場合はそれを使用
    if (results && (results['TOPIX'] || results['日経225'])) {
        return results;
    }

    // Stooqが失敗した場合、Yahoo Financeにフォールバック
    console.log('   ⚠️ Stooq失敗 - Yahoo Financeを試行...');

    const indices = [
        { symbol: '^TPX', name: 'TOPIX' },
        { symbol: '^N225', name: '日経225' }
    ];

    results = {};

    for (const index of indices) {
        try {
            // レート制限対策の待機
            await new Promise(resolve => setTimeout(resolve, 2000));

            const endDate = dayjs();
            const startDate = endDate.subtract(90, 'day');

            const result = await yahooFinance.chart(index.symbol, {
                period1: startDate.format('YYYY-MM-DD'),
                period2: endDate.format('YYYY-MM-DD'),
                interval: '1d'
            });

            if (result && result.quotes) {
                results[index.name] = {
                    symbol: index.symbol,
                    name: index.name,
                    quotes: result.quotes.map(q => ({
                        date: dayjs(q.date).format('YYYY-MM-DD'),
                        open: q.open,
                        high: q.high,
                        low: q.low,
                        close: q.close,
                        volume: q.volume
                    })).filter(q => q.close !== null),
                    source: 'yahoo'
                };
                console.log(`   ✅ ${index.name}: ${result.quotes.length}日分取得 (Yahoo)`);
            }
        } catch (error) {
            console.error(`   ❌ ${index.name}: ${error.message}`);
        }
    }

    return results;
}

export { fetchSingleStock };

