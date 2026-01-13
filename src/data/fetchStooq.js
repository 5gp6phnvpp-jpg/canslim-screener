/**
 * Stooq.com から指数データを取得
 * 
 * Yahoo Financeの代替として使用
 * 無料で日経225、TOPIXのCSVデータを取得可能
 */

import axios from 'axios';
import dayjs from 'dayjs';

/**
 * Stooq.comから指数の日足データを取得
 * 
 * @param {string} symbol - Stooq形式のシンボル（例: ^nkx = 日経225, ^tpx = TOPIX）
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
        console.error(`❌ Stooq取得エラー (${symbol}):`, error.message);
        return null;
    }
}

/**
 * Stooq.comから指数データを取得
 * Yahoo Financeの代替として使用
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
        await new Promise(resolve => setTimeout(resolve, 1000));

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
