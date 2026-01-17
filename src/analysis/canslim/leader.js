/**
 * CANSLIM「L」- Leader or Laggard（業界リーダー）
 * 
 * 業種ランキング + 業種内相対力（RS）
 * 
 * IBD擬似計算式: ((C-C63)/C63*0.4 + (C-C126)/C126*0.2 + (C-C189)/C189*0.2 + (C-C252)/C252*0.2) * 100
 * RS Rating: 1-99スケールで業種/銘柄の相対強度を表示
 * 
 * 参考: https://note.com/mekann/n/n7569aee1d346
 */

// ==== 定数定義 ====

// 期間（営業日数）
const PERIOD_3_MONTHS = 63;    // 3ヶ月
const PERIOD_6_MONTHS = 126;   // 6ヶ月
const PERIOD_9_MONTHS = 189;   // 9ヶ月
const PERIOD_12_MONTHS = 252;  // 12ヶ月（1年）

// IBD方式の加重
const WEIGHT_Q1 = 0.4;  // 直近3ヶ月
const WEIGHT_Q2 = 0.2;  // 6ヶ月
const WEIGHT_Q3 = 0.2;  // 9ヶ月
const WEIGHT_Q4 = 0.2;  // 12ヶ月

// RS Rating閾値
const RS_RATING_LEADER = 80;      // リーダー銘柄（上位20%）
const RS_RATING_TOP10 = 90;       // トップ銘柄（上位10%）
const RS_RATING_ACCEPTABLE = 70;  // 許容範囲（上位30%）

// 最低データ期間
const MIN_DATA_PERIOD = 20;  // 最低20日のデータが必要

// デフォルト期間（業種ランキング用）
const DEFAULT_PERIOD = PERIOD_6_MONTHS;

/**
 * 相対力（Relative Strength）を計算
 * IBD方式: 過去6ヶ月のパフォーマンスを計算
 * 
 * @param {Array} quotes - 日足データ
 * @param {number} period - 期間（日数）、デフォルト126日（6ヶ月）
 */
export function calculateRelativeStrength(quotes, period = DEFAULT_PERIOD) {
    if (quotes.length < period + 1) {
        // データ不足の場合は利用可能な期間で計算
        if (quotes.length < 20) return null;
        period = quotes.length - 1;
    }

    const startPrice = quotes[quotes.length - period - 1].close;
    const endPrice = quotes[quotes.length - 1].close;

    return ((endPrice - startPrice) / startPrice * 100);
}

/**
 * 加重相対力を計算（IBD擬似計算式）
 * 
 * 参考: https://note.com/mekann/n/n7569aee1d346
 * 
 * 計算式:
 * RS = ((C - C63) / C63 * 0.4) +   // 直近3ヶ月: 40%
 *      ((C - C126) / C126 * 0.2) + // 6ヶ月前から現在: 20%
 *      ((C - C189) / C189 * 0.2) + // 9ヶ月前から現在: 20%
 *      ((C - C252) / C252 * 0.2)   // 12ヶ月前から現在: 20%
 * 
 * 重要: 各期間は「○日前の価格から現在価格への変化率」であり、
 *       「その期間内のパフォーマンス」ではない
 * 
 * @param {Array} quotes - 日足データ
 * @returns {number|null} RS値（パーセント）
 */
export function calculateWeightedRS(quotes) {
    const len = quotes.length;

    // 最低63日（3ヶ月）のデータが必要
    if (len < PERIOD_3_MONTHS + 1) {
        return calculateRelativeStrength(quotes, Math.min(DEFAULT_PERIOD, len - 1));
    }

    const currentPrice = quotes[len - 1].close;

    // 各期間の変化率を計算（現在価格から○日前の価格への変化率）
    // 63日前から現在 (直近3ヶ月)
    const price63 = quotes[len - PERIOD_3_MONTHS - 1]?.close;
    const q1 = price63 ? ((currentPrice - price63) / price63) * 100 : 0;

    // 126日前から現在 (6ヶ月)
    const price126 = len >= PERIOD_6_MONTHS + 1 ? quotes[len - PERIOD_6_MONTHS - 1]?.close : null;
    const q2 = price126 ? ((currentPrice - price126) / price126) * 100 : q1;

    // 189日前から現在 (9ヶ月)
    const price189 = len >= PERIOD_9_MONTHS + 1 ? quotes[len - PERIOD_9_MONTHS - 1]?.close : null;
    const q3 = price189 ? ((currentPrice - price189) / price189) * 100 : q2;

    // 252日前から現在 (12ヶ月)
    const price252 = len >= PERIOD_12_MONTHS + 1 ? quotes[len - PERIOD_12_MONTHS - 1]?.close : null;
    const q4 = price252 ? ((currentPrice - price252) / price252) * 100 : q3;

    // IBD擬似計算式: 加重平均
    return (q1 * WEIGHT_Q1) + (q2 * WEIGHT_Q2) + (q3 * WEIGHT_Q3) + (q4 * WEIGHT_Q4);
}

/**
 * 業種ごとのパフォーマンスを計算（IBD方式）
 * 
 * @param {Object} stocksByIndustry - 業種別銘柄データ
 * @param {Object} priceDataMap - 証券コード => 株価データのマップ
 * @param {number} period - 計算期間（デフォルト: 126日 = 6ヶ月）
 */
export function calculateIndustryRankings(stocksByIndustry, priceDataMap, period = DEFAULT_PERIOD) {
    const rankings = [];

    for (const [industry, stocks] of Object.entries(stocksByIndustry)) {
        const performances = [];
        const volumes = [];
        let newHighCount = 0;

        for (const stock of stocks) {
            const priceData = priceDataMap[stock.code];

            // データ期間チェック:
            // - 126日以上: IBD準拠の完全な計算
            // - 20日以上126日未満: 利用可能なデータで計算（暫定）
            // - 20日未満: スキップ
            // → API統合で126日以上取得できれば自動的にIBD準拠になる
            if (!priceData || priceData.quotes.length < 20) continue;

            // 利用可能なデータで計算（API統合後は自動的にperiod=126日で計算）
            const availablePeriod = Math.min(period, priceData.quotes.length - 1);

            const rs = calculateRelativeStrength(priceData.quotes, availablePeriod);
            if (rs !== null) {
                performances.push({ code: stock.code, name: stock.name, rs });
            }

            // 出来高増加率
            const quotes = priceData.quotes;
            const recentVol = quotes.slice(-5).reduce((s, q) => s + q.volume, 0) / 5;
            const prevVol = quotes.slice(-25, -5).reduce((s, q) => s + q.volume, 0) / 20;
            if (prevVol > 0) {
                volumes.push((recentVol / prevVol - 1) * 100);
            }

            // 52週新高値チェック
            const high52 = Math.max(...quotes.slice(-252).map(q => q.high));
            if (quotes[quotes.length - 1].high >= high52 * 0.98) {
                newHighCount++;
            }
        }

        if (performances.length === 0) continue;

        // 業種平均パフォーマンス
        const avgPerformance = performances.reduce((s, p) => s + p.rs, 0) / performances.length;
        const avgVolumeGrowth = volumes.length > 0
            ? volumes.reduce((s, v) => s + v, 0) / volumes.length
            : 0;

        // トップパフォーマー
        performances.sort((a, b) => b.rs - a.rs);
        const topPerformers = performances.slice(0, 3);

        rankings.push({
            industry,
            performance: parseFloat(avgPerformance.toFixed(2)),
            volumeGrowth: parseFloat(avgVolumeGrowth.toFixed(1)),
            newHighCount,
            stockCount: performances.length,
            topPerformers
        });
    }

    // パフォーマンス順にソート
    rankings.sort((a, b) => b.performance - a.performance);

    const totalIndustries = rankings.length;

    // ランク付けとRS Rating（0-99スケール）を計算
    return rankings.map((r, i) => {
        // RS Rating = 100 - (パーセンタイルランク)
        // 1位 = 99, 最下位 = 1
        const rsRating = Math.max(1, Math.round(99 - (i / totalIndustries) * 99));

        return {
            rank: i + 1,
            ...r,
            rsRating,  // 0-99スケールの業種RS Rating
            isTop20: rsRating >= 80,  // RS Rating 80以上がTOP20%
            isTop10: rsRating >= 90   // RS Rating 90以上がTOP10%
        };
    });
}

/**
 * 全銘柄のRS値を計算してソート済みリストを返す
 * 銘柄RS Ratingのパーセンタイル計算に使用
 * 
 * @param {Array} stockList - 銘柄リスト
 * @param {Object} priceDataMap - 株価データマップ
 * @returns {Object} { sortedRSList: number[], rsMap: Map<code, rs> }
 */
export function calculateAllStockRS(stockList, priceDataMap) {
    const rsValues = [];
    const rsMap = new Map();

    for (const stock of stockList) {
        const priceData = priceDataMap[stock.code];
        if (!priceData || priceData.quotes.length < 20) continue;

        const rs = calculateWeightedRS(priceData.quotes);
        if (rs !== null && !isNaN(rs)) {
            rsValues.push(rs);
            rsMap.set(stock.code, rs);
        }
    }

    // 昇順にソート（パーセンタイル計算用）
    rsValues.sort((a, b) => a - b);

    return {
        sortedRSList: rsValues,
        rsMap,
        count: rsValues.length
    };
}

/**
 * 銘柄RS Ratingを計算（0-99スケール）
 * 全銘柄中でのパーセンタイルランキング
 * 
 * @param {number} stockRS - 銘柄のRS値
 * @param {Array} sortedRSList - ソート済み全銘柄RS値リスト
 * @returns {number} RS Rating (1-99)
 */
export function calculateStockRSRating(stockRS, sortedRSList) {
    if (!sortedRSList || sortedRSList.length === 0) return 50; // デフォルト

    // 二分探索でパーセンタイル位置を見つける
    let left = 0;
    let right = sortedRSList.length;

    while (left < right) {
        const mid = Math.floor((left + right) / 2);
        if (sortedRSList[mid] < stockRS) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }

    // パーセンタイルランク（0-99）
    const percentile = (left / sortedRSList.length) * 99;
    return Math.max(1, Math.min(99, Math.round(percentile)));
}

/**
 * 銘柄が業種内でリーダーかどうかを判定（IBD方式）
 * 
 * @param {string} code - 証券コード
 * @param {Array} industryRankings - 業種ランキング
 * @param {Object} priceDataMap - 株価データマップ
 * @param {Object} stockInfo - 銘柄情報（業種を含む）
 * @param {Array} sortedRSList - ソート済み全銘柄RS値リスト（正確なパーセンタイル計算用）
 */
export function analyzeLeader(code, industryRankings, priceDataMap, stockInfo, sortedRSList = null) {
    const industry = stockInfo.sector33 || stockInfo.sector17;

    // 銘柄の業種を見つける
    const industryData = industryRankings.find(r => r.industry === industry);

    if (!industryData) {
        return {
            passed: false,
            reason: '業種データなし'
        };
    }

    const priceData = priceDataMap[code];
    if (!priceData) {
        return {
            passed: false,
            reason: '株価データなし'
        };
    }

    // 業種RS Rating（0-99スケール）
    const industryRSRating = industryData.rsRating || 0;
    const industryRank = industryData.rank;
    const isTop20Industry = industryData.isTop20;
    const isTop10Industry = industryData.isTop10;

    // 銘柄の加重相対力（IBD擬似計算式）
    const stockRS = calculateWeightedRS(priceData.quotes);

    // 銘柄RS Rating の計算（全銘柄リストがある場合は正確に計算）
    let stockRSRating;
    if (sortedRSList && sortedRSList.length > 0) {
        // 正確なパーセンタイル計算
        stockRSRating = calculateStockRSRating(stockRS, sortedRSList);
    } else {
        // フォールバック: 業種内での簡易計算（非推奨）
        const allRS = industryData.topPerformers.map(p => p.rs);
        allRS.push(stockRS); // 自分自身も含める
        allRS.sort((a, b) => a - b);
        const rank = allRS.indexOf(stockRS);
        stockRSRating = Math.round((rank / allRS.length) * 99);
    }

    // 判定基準（IBD方式）:
    // - 業種RS Rating >= 80（上位20%）
    // - 銘柄RS Rating >= 70（理想は80以上）
    const passed = isTop20Industry && stockRSRating >= RS_RATING_ACCEPTABLE;
    const isLeader = isTop20Industry && stockRSRating >= RS_RATING_LEADER;

    return {
        passed,
        isLeader,
        industry,
        industryRank,
        industryRSRating,
        isTop20Industry,
        isTop10Industry,
        stockRS: parseFloat((stockRS || 0).toFixed(2)),
        stockRSRating,
        industryPerformance: industryData.performance,
        summary: isLeader
            ? `🏆 リーダー! 業種RS: ${industryRSRating}, 銘柄RS: ${stockRSRating}`
            : isTop20Industry
                ? `業種RS: ${industryRSRating} (TOP20), 銘柄RS: ${stockRSRating}`
                : `業種RS: ${industryRSRating} - TOP20圏外`
    };
}

