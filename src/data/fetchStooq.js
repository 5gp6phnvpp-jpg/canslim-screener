/**
 * Stooq.com から指数・株価データを取得
 * 
 * Yahoo Financeの代替として使用
 * 無料で日経225、TOPIX、日本株のCSVデータを取得可能
 */

import axios from 'axios';
import dayjs from 'dayjs';

/**
 * Stooq.comからデータを取得
 * 
 * @param {string} symbol - Stooq形式のシンボル（例: ^nkx = 日経225, 7203.jp = トヨタ）
 * @param {number} days - 取得する日数
 */
async function fetchStooqData(symbol, days = 90) {
    const endDate = dayjs();
    const startDate = endDate.subtract(days, 'day');

    const url = `https://stooq.com/q/d/l/?s=${symbol}&d1=${startDate.format('YYYYMMDD')}&d2=${endDate.format('YYYYMMDD')}`;

    try {
        const response = await axios.get(url, {
            timeout: 15000,
            responseType: 'text'
        });

        const lines = response.data.trim().split('\n');
        if (lines.length < 2) return null;

        // CSVヘッダーを確認（Date,Open,High,Low,Close,Volume）
        const header = lines[0].toLowerCase();
        if (!header.includes('date') || !header.includes('close')) {
            return null;
        }

        const quotes = [];
        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(',');
            if (parts.length >= 5) {
                quotes.push({
                    date: parts[0],
                    open: parseFloat(parts[1]),
                    high: parseFloat(parts[2]),
                    low: parseFloat(parts[3]),
                    close: parseFloat(parts[4]),
                    volume: parts[5] ? parseInt(parts[5]) : 0
                });
            }
        }

        // 日付順にソート（古い順）
        quotes.sort((a, b) => new Date(a.date) - new Date(b.date));

        return quotes;
    } catch (error) {
        // エラーは静かに処理
        return null;
    }
}

/**
 * Stooq.comから指数データを取得
 */
export async function fetchIndexDataFromStooq() {
    console.log('📊 指数データを取得中 (Stooq.com)...');

    const indices = [
        { stooqSymbol: '^nkx', name: '日経225' },
        { stooqSymbol: '^tpx', name: 'TOPIX' }
    ];

    const results = {};

    for (const index of indices) {
        // レート制限対策
        await new Promise(resolve => setTimeout(resolve, 500));

        const quotes = await fetchStooqData(index.stooqSymbol);

        if (quotes && quotes.length > 0) {
            results[index.name] = {
                symbol: index.stooqSymbol,
                name: index.name,
                quotes: quotes.filter(q => q.close !== null && !isNaN(q.close)),
                source: 'stooq'
            };
            console.log(`   ✅ ${index.name}: ${quotes.length}日分取得`);
        } else {
            console.log(`   ⚠️ ${index.name}: 取得失敗`);
        }
    }

    return results;
}

/**
 * Stooq.comから個別株の株価データを取得
 * 
 * @param {string} code - 証券コード（例: 7203）
 * @param {number} days - 取得する日数
 */
export async function fetchStockFromStooq(code, days = 90) {
    // Stooq形式: 証券コード.jp
    const symbol = `${code}.jp`;

    const quotes = await fetchStooqData(symbol, days);

    if (!quotes || quotes.length === 0) {
        return null;
    }

    return {
        code,
        symbol,
        name: '',  // Stooqからは名前が取れないので空
        currency: 'JPY',
        quotes,
        source: 'stooq'
    };
}

/**
 * 複数銘柄の株価データをStooqからバッチ取得
 */
export async function fetchPriceDataFromStooq(codes, progressCallback = null) {
    const results = [];
    const BATCH_SIZE = 20;  // Stooqはレート制限が緩いので大きめ
    const DELAY_MS = 500;   // 待機時間

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
            batch.map(code => fetchStockFromStooq(code))
        );

        // 成功したものだけ追加
        results.push(...batchResults.filter(r => r !== null));

        // レート制限対策で待機
        if (i + BATCH_SIZE < codes.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
    }

    return results;
}
