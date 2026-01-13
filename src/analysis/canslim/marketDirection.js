/**
 * CANSLIM「M」- Market Direction（マーケットの方向性）
 * 
 * マーケット全体のトレンドを判定し、エントリーすべきかを判断する
 */

/**
 * 移動平均を計算
 */
function calculateMA(data, period) {
    if (data.length < period) return null;
    const slice = data.slice(-period);
    return slice.reduce((sum, d) => sum + d.close, 0) / period;
}

/**
 * ディストリビューションデイをカウント
 * 定義: 前日比で下落 かつ 出来高が前日より増加
 * 
 * @param {Array} quotes - 日足データ
 * @param {number} lookbackDays - 確認する期間（デフォルト: 25営業日）
 */
function countDistributionDays(quotes, lookbackDays = 25) {
    if (quotes.length < lookbackDays + 1) return 0;

    const recentQuotes = quotes.slice(-lookbackDays - 1);
    let count = 0;

    for (let i = 1; i < recentQuotes.length; i++) {
        const today = recentQuotes[i];
        const yesterday = recentQuotes[i - 1];

        // 下落率が0.2%以上 かつ 出来高増加
        const priceChange = (today.close - yesterday.close) / yesterday.close;
        const volumeIncreased = today.volume > yesterday.volume;

        if (priceChange <= -0.002 && volumeIncreased) {
            count++;
        }
    }

    return count;
}

/**
 * フォロースルーデイを検出
 * 定義: 調整後4-7日目に、出来高を伴って1.5%以上上昇
 * 
 * @param {Array} quotes - 日足データ
 * @param {number} lookbackDays - 確認する期間
 */
function detectFollowThroughDay(quotes, lookbackDays = 20) {
    if (quotes.length < lookbackDays) return null;

    const recentQuotes = quotes.slice(-lookbackDays);

    // 直近の安値を探す（調整の底）
    let lowestIdx = 0;
    let lowestPrice = recentQuotes[0].low;

    for (let i = 1; i < recentQuotes.length - 7; i++) {
        if (recentQuotes[i].low < lowestPrice) {
            lowestPrice = recentQuotes[i].low;
            lowestIdx = i;
        }
    }

    // 安値から4-7日後をチェック
    for (let offset = 4; offset <= 7 && lowestIdx + offset < recentQuotes.length; offset++) {
        const day = recentQuotes[lowestIdx + offset];
        const prevDay = recentQuotes[lowestIdx + offset - 1];

        const priceChange = (day.close - prevDay.close) / prevDay.close;
        const volumeAboveAvg = day.volume > calculateAverageVolume(quotes, 50);

        if (priceChange >= 0.015 && volumeAboveAvg) {
            return {
                date: day.date,
                gain: (priceChange * 100).toFixed(2),
                daysAfterLow: offset
            };
        }
    }

    return null;
}

/**
 * 平均出来高を計算
 */
function calculateAverageVolume(quotes, period) {
    if (quotes.length < period) return 0;
    const slice = quotes.slice(-period);
    return slice.reduce((sum, d) => sum + d.volume, 0) / period;
}

/**
 * マーケット状況を分析
 * 
 * @param {Object} indexData - 指数データ（TOPIX, 日経225）
 * @returns {Object} マーケット判定結果
 */
export function analyzeMarketTrend(indexData) {
    const topix = indexData['TOPIX'];
    const nikkei = indexData['日経225'];

    // 指数データがない場合は「中立」として続行可能に
    if (!topix || !nikkei || !topix.quotes || topix.quotes.length < 50) {
        return {
            status: 'NEUTRAL',
            message: '⚪ 指数データなし - スクリーニングは続行',
            canEnter: true,  // 中立として続行可能
            details: {
                topix: null,
                distributionDays: 0,
                followThrough: null,
                dataUnavailable: true
            }
        };
    }

    const quotes = topix.quotes;
    if (quotes.length < 50) {
        return {
            status: 'UNKNOWN',
            message: 'データ不足',
            canEnter: false
        };
    }

    // 50日移動平均との比較
    const ma50 = calculateMA(quotes, 50);
    const currentPrice = quotes[quotes.length - 1].close;
    const aboveMA50 = currentPrice > ma50;
    const distanceFromMA50 = ((currentPrice - ma50) / ma50 * 100).toFixed(2);

    // ディストリビューションデイのカウント
    const distributionDays = countDistributionDays(quotes, 25);

    // フォロースルーデイの検出
    const followThrough = detectFollowThroughDay(quotes, 20);

    // 状態判定
    let status, message, canEnter;

    if (aboveMA50 && distributionDays <= 3) {
        status = 'CONFIRMED';
        message = `✅ 上昇トレンド確認 (50日MA比: +${distanceFromMA50}%)`;
        canEnter = true;
    } else if (distributionDays >= 4 && distributionDays <= 5) {
        status = 'UNDER_PRESSURE';
        message = `⚠️ 圧力下 (ディストリビューション: ${distributionDays}日)`;
        canEnter = true;  // 慎重にエントリー可
    } else if (distributionDays >= 6 || !aboveMA50) {
        status = 'CORRECTION';
        message = `🚫 調整局面 - 新規エントリー非推奨`;
        canEnter = false;
    } else {
        status = 'UNCERTAIN';
        message = '判定不明';
        canEnter = false;
    }

    return {
        status,
        message,
        canEnter,
        details: {
            topix: {
                current: currentPrice,
                ma50,
                aboveMA50,
                distanceFromMA50: parseFloat(distanceFromMA50)
            },
            distributionDays,
            followThrough
        }
    };
}

export { countDistributionDays, detectFollowThroughDay, calculateMA };
