/**
 * J-Quants API - 決算発表予定日取得
 * 
 * Freeプランで利用可能
 * 決算発表が近い銘柄を特定し、リスク回避に活用
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import dayjs from 'dayjs';

// J-Quants API V2 ベースURL（重要: jpx- なし）
const JQUANTS_API_BASE = 'https://api.jquants.com';

/**
 * 決算発表予定日を取得
 * @param {string} apiKey - J-Quants APIキー
 * @returns {Promise<Object>} 銘柄コード => 決算発表日のマップ
 */
async function fetchEarningsDates(apiKey) {
    if (!apiKey) {
        console.log('   ⚠️ APIキーなし - 決算フィルタースキップ');
        return null;
    }

    try {
        console.log('📅 決算発表予定日を取得中...');

        // V2エンドポイント: /v2/equities/earnings-calendar
        const response = await axios.get(`${JQUANTS_API_BASE}/v2/equities/earnings-calendar`, {
            headers: { 'x-api-key': apiKey },
            timeout: 15000
        });

        const announcements = response.data.announcement || [];
        console.log(`   ✅ ${announcements.length}件の決算発表予定を取得`);

        // 銘柄コード => 決算発表日のマップを作成
        const earningsMap = {};

        for (const item of announcements) {
            const code = item.Code || item.code;
            const date = item.Date || item.date;

            if (code && date) {
                earningsMap[code] = {
                    date: date,
                    companyName: item.CompanyName || item.company_name || '',
                    fiscalYear: item.FiscalYear || item.fiscal_year || '',
                    fiscalQuarter: item.FiscalQuarter || item.fiscal_quarter || ''
                };
            }
        }

        return earningsMap;

    } catch (error) {
        console.log(`   ⚠️ 決算発表予定日の取得に失敗: ${error.response?.status || error.message}`);
        return null;
    }
}

/**
 * 決算発表予定日をキャッシュとして保存
 */
async function saveEarningsCache(earningsMap) {
    const cacheDir = path.join(process.cwd(), 'data');
    await fs.mkdir(cacheDir, { recursive: true });

    const cachePath = path.join(cacheDir, 'earnings_dates.json');
    await fs.writeFile(cachePath, JSON.stringify({
        updatedAt: new Date().toISOString(),
        count: Object.keys(earningsMap).length,
        earnings: earningsMap
    }, null, 2));
}

/**
 * キャッシュから決算発表予定日を読み込み（1日以内なら再利用）
 */
async function loadEarningsCache() {
    const cachePath = path.join(process.cwd(), 'data', 'earnings_dates.json');

    try {
        const content = await fs.readFile(cachePath, 'utf-8');
        const cache = JSON.parse(content);

        const updatedAt = new Date(cache.updatedAt);
        const now = new Date();
        const hoursSinceUpdate = (now - updatedAt) / (1000 * 60 * 60);

        if (hoursSinceUpdate < 24) {
            console.log(`📦 キャッシュから決算発表予定日を読み込み: ${cache.count}件`);
            return cache.earnings;
        }
    } catch (error) {
        // キャッシュなし
    }

    return null;
}

/**
 * 決算発表予定日を取得（キャッシュ対応）
 */
export async function getEarningsDates(apiKey) {
    // キャッシュ確認
    const cached = await loadEarningsCache();
    if (cached) {
        return cached;
    }

    // APIから取得
    const earningsMap = await fetchEarningsDates(apiKey);

    if (earningsMap && Object.keys(earningsMap).length > 0) {
        await saveEarningsCache(earningsMap);
        return earningsMap;
    }

    return {};
}

/**
 * 銘柄の決算リスクを分析
 * 
 * @param {string} code - 証券コード
 * @param {Object} earningsMap - 決算発表予定日マップ
 * @returns {Object} 決算リスク分析結果
 */
export function analyzeEarningsRisk(code, earningsMap) {
    if (!earningsMap || !earningsMap[code]) {
        return {
            hasEarnings: false,
            risk: 'UNKNOWN',
            message: '決算情報なし'
        };
    }

    const earnings = earningsMap[code];
    const earningsDate = dayjs(earnings.date);
    const today = dayjs();
    const daysUntilEarnings = earningsDate.diff(today, 'day');

    let risk, message;

    if (daysUntilEarnings < 0) {
        // 決算発表済み
        risk = 'POST_EARNINGS';
        message = `決算発表済み（${Math.abs(daysUntilEarnings)}日前）`;
    } else if (daysUntilEarnings <= 3) {
        // 3日以内 - 高リスク
        risk = 'HIGH';
        message = `⚠️ 決算まで${daysUntilEarnings}日 - 要注意`;
    } else if (daysUntilEarnings <= 7) {
        // 1週間以内 - 中リスク
        risk = 'MEDIUM';
        message = `📅 決算まで${daysUntilEarnings}日`;
    } else if (daysUntilEarnings <= 14) {
        // 2週間以内 - 低リスク
        risk = 'LOW';
        message = `決算まで${daysUntilEarnings}日`;
    } else {
        // 2週間以上先 - 安全
        risk = 'SAFE';
        message = `決算まで${daysUntilEarnings}日以上`;
    }

    return {
        hasEarnings: true,
        risk,
        message,
        date: earnings.date,
        daysUntilEarnings,
        fiscalYear: earnings.fiscalYear,
        fiscalQuarter: earnings.fiscalQuarter
    };
}
