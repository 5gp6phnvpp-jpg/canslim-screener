/**
 * CANSLIM「S」- Supply and Demand（需給）
 * 
 * 50日EMAフィルター + 出来高分析
 */

/**
 * EMA（指数移動平均）を計算
 * @param {Array} data - 日足データ
 * @param {number} period - 期間
 */
export function calculateEMA(data, period) {
    if (data.length < period) return null;

    const multiplier = 2 / (period + 1);

    // 最初のEMAは単純移動平均
    let ema = data.slice(0, period).reduce((sum, d) => sum + d.close, 0) / period;

    // 以降はEMA計算
    for (let i = period; i < data.length; i++) {
        ema = (data[i].close - ema) * multiplier + ema;
    }

    return ema;
}

/**
 * 50日平均出来高を計算
 */
export function calculateAvgVolume(data, period = 50) {
    if (data.length < period) return null;
    const slice = data.slice(-period);
    return slice.reduce((sum, d) => sum + d.volume, 0) / period;
}

/**
 * 出来高が減少傾向かどうか（ハンドル形成中の理想的なパターン）
 */
function isVolumeDecreasing(data, period = 10) {
    if (data.length < period) return false;

    const recentVolumes = data.slice(-period).map(d => d.volume);
    const firstHalf = recentVolumes.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const secondHalf = recentVolumes.slice(5).reduce((a, b) => a + b, 0) / 5;

    return secondHalf < firstHalf;
}

/**
 * 需給を分析
 * 
 * @param {Array} quotes - 日足データ
 * @param {number} currentVolume - 当日出来高（オプション、リアルタイム用）
 * @returns {Object} 需給分析結果
 */
export function analyzeSupplyDemand(quotes, currentVolume = null) {
    if (quotes.length < 50) {
        return {
            passed: false,
            reason: 'データ不足'
        };
    }

    const latestQuote = quotes[quotes.length - 1];
    const currentPrice = latestQuote.close;
    const volume = currentVolume || latestQuote.volume;

    // 50日EMA計算
    const ema50 = calculateEMA(quotes, 50);
    const aboveEMA50 = currentPrice > ema50;
    const distanceFromEMA50 = ((currentPrice - ema50) / ema50 * 100).toFixed(2);

    // 50日平均出来高
    const avgVolume50 = calculateAvgVolume(quotes, 50);
    const volumeRatio = volume / avgVolume50;
    const volumeConfirmed = volumeRatio >= 1.4;  // 40%以上増加

    // ハンドル期間中の出来高減少チェック
    const handleVolumeDecreasing = isVolumeDecreasing(quotes, 10);

    // 総合判定
    // 基本条件: 50日EMAより上
    // ブレイクアウト条件: 出来高140%以上
    const passed = aboveEMA50;

    return {
        passed,
        aboveEMA50,
        ema50: Math.round(ema50),
        currentPrice,
        distanceFromEMA50: parseFloat(distanceFromEMA50),
        volumeRatio: parseFloat(volumeRatio.toFixed(2)),
        volumeConfirmed,
        avgVolume50: Math.round(avgVolume50),
        currentVolume: volume,
        handleVolumeDecreasing,
        summary: aboveEMA50
            ? `50日EMA上 (${distanceFromEMA50 > 0 ? '+' : ''}${distanceFromEMA50}%), 出来高 ${(volumeRatio * 100).toFixed(0)}%`
            : `50日EMA下 - フィルター除外`
    };
}

export { isVolumeDecreasing };
