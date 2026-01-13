/**
 * CANSLIM「N」- New Products, New Highs（新しさ）
 * 
 * 52週新高値の判定
 */

/**
 * 52週（約252営業日）の最高値を取得
 */
function get52WeekHigh(quotes) {
    if (quotes.length < 10) return null;

    // 最大252日分を使用
    const period = Math.min(quotes.length, 252);
    const slice = quotes.slice(-period);

    return Math.max(...slice.map(q => q.high));
}

/**
 * 52週の最安値を取得
 */
function get52WeekLow(quotes) {
    if (quotes.length < 10) return null;

    const period = Math.min(quotes.length, 252);
    const slice = quotes.slice(-period);

    return Math.min(...slice.map(q => q.low));
}

/**
 * 「N」要素を分析
 * 
 * @param {Array} quotes - 日足データ
 * @returns {Object} 新高値分析結果
 */
export function analyzeNewHighs(quotes) {
    if (quotes.length < 50) {
        return {
            passed: false,
            reason: 'データ不足'
        };
    }

    const latestQuote = quotes[quotes.length - 1];
    const currentPrice = latestQuote.close;
    const todayHigh = latestQuote.high;

    const high52Week = get52WeekHigh(quotes);
    const low52Week = get52WeekLow(quotes);

    // 新高値からの距離
    const distanceFromHigh = ((high52Week - currentPrice) / high52Week * 100);
    const distanceFromLow = ((currentPrice - low52Week) / low52Week * 100);

    // 52週レンジ内での位置（0-100%）
    const rangePosition = ((currentPrice - low52Week) / (high52Week - low52Week) * 100);

    // 判定基準:
    // - 新高値から10%以内であれば合格
    // - 新高値更新はボーナス
    const isAtNewHigh = todayHigh >= high52Week;
    const isNear52WeekHigh = distanceFromHigh <= 10;
    const passed = isNear52WeekHigh;

    return {
        passed,
        isAtNewHigh,
        isNear52WeekHigh,
        high52Week: Math.round(high52Week),
        low52Week: Math.round(low52Week),
        currentPrice,
        distanceFromHigh: parseFloat(distanceFromHigh.toFixed(2)),
        distanceFromLow: parseFloat(distanceFromLow.toFixed(2)),
        rangePosition: parseFloat(rangePosition.toFixed(1)),
        summary: isAtNewHigh
            ? '🔥 52週新高値更新!'
            : isNear52WeekHigh
                ? `新高値まで ${distanceFromHigh.toFixed(1)}%`
                : `新高値から ${distanceFromHigh.toFixed(1)}%下 - 要注意`
    };
}

export { get52WeekHigh, get52WeekLow };
