/**
 * 時価総額データ取得モジュール
 * 
 * Yahoo Financeから時価総額を取得し、
 * 上位N銘柄に絞り込む機能を提供
 */

import yahooFinance from 'yahoo-finance2';

// yahoo-finance2 の設定
yahooFinance.setGlobalConfig({
    validation: { logErrors: false }
});

/**
 * 単一銘柄の時価総額を取得
 */
async function fetchMarketCap(code) {
    const symbol = `${code}.T`;

    try {
        const quote = await yahooFinance.quote(symbol, {
            fields: ['marketCap', 'regularMarketPrice', 'sharesOutstanding']
        });

        if (quote && quote.marketCap) {
            return {
                code,
                marketCap: quote.marketCap,
                price: quote.regularMarketPrice
            };
        }
    } catch (error) {
        // エラーは静かに処理
    }

    return null;
}

/**
 * 複数銘柄の時価総額をバッチ取得
 * 
 * @param {Array<string>} codes - 証券コードの配列
 * @param {Function} progressCallback - 進捗コールバック
 */
export async function fetchMarketCapData(codes, progressCallback = null) {
    const results = [];
    const BATCH_SIZE = 50;   // Yahoo Financeは比較的緩い
    const DELAY_MS = 1000;   // 1秒待機

    const totalBatches = Math.ceil(codes.length / BATCH_SIZE);

    console.log('📊 時価総額データを取得中...');

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
            batch.map(code => fetchMarketCap(code))
        );

        // 成功したものだけ追加
        results.push(...batchResults.filter(r => r !== null));

        // レート制限対策で待機
        if (i + BATCH_SIZE < codes.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
    }

    console.log(`   ✅ ${results.length}/${codes.length}銘柄の時価総額取得完了`);

    return results;
}

/**
 * 時価総額上位N銘柄を選択
 * 
 * @param {Array<Object>} stockList - 銘柄リスト
 * @param {number} topN - 上位何銘柄を選択するか
 * @param {Array<Object>} marketCapData - 時価総額データ（事前取得済みの場合）
 */
export async function filterByMarketCap(stockList, topN = 1000, marketCapData = null) {
    console.log(`📈 時価総額上位${topN}銘柄に絞り込み中...`);

    // 時価総額データがない場合は取得
    if (!marketCapData || marketCapData.length === 0) {
        const codes = stockList.map(s => s.code);
        marketCapData = await fetchMarketCapData(codes, (progress) => {
            process.stdout.write(`\r   バッチ ${progress.current}/${progress.total} (${progress.percent}%)`);
        });
        console.log('');
    }

    // 時価総額でソート（降順）
    const sortedByMarketCap = [...marketCapData]
        .filter(m => m.marketCap && m.marketCap > 0)
        .sort((a, b) => b.marketCap - a.marketCap);

    // 上位N銘柄のコードを取得
    const topCodes = new Set(
        sortedByMarketCap.slice(0, topN).map(m => m.code)
    );

    // 銘柄リストをフィルター
    const filtered = stockList.filter(s => topCodes.has(s.code));

    console.log(`   ✅ ${filtered.length}銘柄に絞り込み完了`);

    // 時価総額情報を銘柄リストに追加
    const marketCapMap = Object.fromEntries(
        marketCapData.map(m => [m.code, m.marketCap])
    );

    for (const stock of filtered) {
        stock.marketCap = marketCapMap[stock.code] || null;
    }

    return filtered;
}

/**
 * 時価総額に基づいて銘柄をランク付け
 */
export function addMarketCapRank(stockList, marketCapData) {
    const marketCapMap = Object.fromEntries(
        marketCapData.map(m => [m.code, m.marketCap])
    );

    // 時価総額順にソート
    const sorted = [...stockList]
        .map(s => ({ ...s, marketCap: marketCapMap[s.code] || 0 }))
        .sort((a, b) => b.marketCap - a.marketCap);

    // ランク付け
    sorted.forEach((s, i) => {
        s.marketCapRank = i + 1;
    });

    return sorted;
}
