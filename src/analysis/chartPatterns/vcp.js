/**
 * VCP (Volatility Contraction Pattern) 検出
 * 
 * ミネルヴィニの代表的なエントリーパターン
 * 
 * VCPの特徴:
 * - 調整のたびに価格レンジが収縮する（各収縮は前回の約50%）
 * - 同時に出来高も減少する
 * - 2〜4回の収縮後、出来高を伴ってブレイクアウト
 */

/**
 * 価格レンジの収縮を検出
 * 
 * @param {Array} quotes - 日足データ
 * @param {number} minContractions - 最小収縮回数（デフォルト: 2）
 * @param {number} lookbackDays - 確認期間（デフォルト: 60日）
 */
export function detectVolatilityContractions(quotes, minContractions = 2, lookbackDays = 60) {
    if (quotes.length < lookbackDays) {
        return null;
    }

    const recentQuotes = quotes.slice(-lookbackDays);
    const contractions = [];

    // 週単位でボラティリティを計算（5営業日 = 1週間）
    const weeklyRanges = [];
    for (let i = 0; i < recentQuotes.length - 5; i += 5) {
        const week = recentQuotes.slice(i, i + 5);
        const high = Math.max(...week.map(q => q.high));
        const low = Math.min(...week.map(q => q.low));
        const range = ((high - low) / low) * 100;
        const avgVolume = week.reduce((s, q) => s + q.volume, 0) / 5;

        weeklyRanges.push({
            startIdx: i,
            endIdx: i + 4,
            high,
            low,
            range,
            avgVolume,
            startDate: week[0].date,
            endDate: week[week.length - 1].date
        });
    }

    if (weeklyRanges.length < 4) {
        return null;
    }

    // 収縮パターンを検出
    let previousRange = weeklyRanges[0].range;
    let previousVolume = weeklyRanges[0].avgVolume;
    let contractionCount = 0;
    let peakHigh = weeklyRanges[0].high;
    let peakWeek = weeklyRanges[0];

    for (let i = 1; i < weeklyRanges.length; i++) {
        const current = weeklyRanges[i];

        // 新しいピークを更新
        if (current.high > peakHigh) {
            peakHigh = current.high;
            peakWeek = current;
            contractionCount = 0; // リセット
            previousRange = current.range;
            previousVolume = current.avgVolume;
            continue;
        }

        // 収縮をチェック
        // ミネルヴィニ基準: 各収縮は前回の約50-80%が理想
        const rangeContraction = current.range / previousRange;
        const volumeContraction = current.avgVolume / previousVolume;

        // 収縮判定（レンジが前回の85%以下）
        if (rangeContraction <= 0.85 && current.range < previousRange) {
            contractionCount++;
            contractions.push({
                week: i,
                range: current.range,
                previousRange,
                contractionRatio: rangeContraction,
                volumeRatio: volumeContraction,
                // 収縮の質を評価（50%収縮が理想）
                contractionQuality: rangeContraction <= 0.5 ? 'excellent' :
                    rangeContraction <= 0.65 ? 'good' : 'fair',
                date: current.endDate
            });
        }

        previousRange = current.range;
        previousVolume = current.avgVolume;
    }

    return {
        detected: contractionCount >= minContractions,
        contractionCount,
        contractions,
        peakHigh,
        peakWeek,
        weeklyRanges
    };
}

/**
 * VCPパターンを検出してエントリーポイントを特定
 * 
 * @param {Array} quotes - 日足データ
 * @returns {Object} VCP検出結果
 */
export function detectVCP(quotes) {
    if (quotes.length < 60) {
        return {
            detected: false,
            reason: 'データ不足（最低60日必要）'
        };
    }

    // 収縮パターンを検出
    const contractionData = detectVolatilityContractions(quotes, 2, 60);

    if (!contractionData || !contractionData.detected) {
        return {
            detected: false,
            reason: '十分な収縮パターンが見つかりません'
        };
    }

    const { contractionCount, peakHigh, weeklyRanges, contractions } = contractionData;

    // 最新の週のデータ
    const lastWeek = weeklyRanges[weeklyRanges.length - 1];
    const currentPrice = quotes[quotes.length - 1].close;

    // ピボットポイント = ピーク高値
    const pivotPrice = Math.round(peakHigh * 1.001);
    const buyZoneMax = Math.round(pivotPrice * 1.05);

    // 出来高の枯渇度を計算（最近5日 vs 50日平均）
    const recentVol = quotes.slice(-5).reduce((s, q) => s + q.volume, 0) / 5;
    const avgVol50 = quotes.slice(-50).reduce((s, q) => s + q.volume, 0) / 50;
    const volumeDryUp = recentVol / avgVol50;

    // VCPの品質スコア（0-100）
    let qualityScore = 0;

    // 収縮回数（2回=15点、3回=25点、4回以上=35点）
    qualityScore += Math.min(contractionCount, 4) * 8 + (contractionCount >= 2 ? 5 : 0);

    // 収縮の質を評価（excellent/good/fair）
    const excellentCount = contractions.filter(c => c.contractionQuality === 'excellent').length;
    const goodCount = contractions.filter(c => c.contractionQuality === 'good').length;
    qualityScore += excellentCount * 10 + goodCount * 5;

    // 出来高枯渇（0.5以下で15点、0.7以下で8点）
    if (volumeDryUp <= 0.5) qualityScore += 15;
    else if (volumeDryUp <= 0.7) qualityScore += 8;

    // 最終収縮のタイトさ（レンジ5%以下で15点、10%以下で8点）
    const lastRange = lastWeek.range;
    if (lastRange <= 5) qualityScore += 15;
    else if (lastRange <= 10) qualityScore += 8;

    // ピボットまでの距離（5%以内で10点）
    const distanceToPivot = ((pivotPrice - currentPrice) / currentPrice) * 100;
    if (distanceToPivot <= 5 && distanceToPivot > 0) qualityScore += 10;

    // シグナル判定
    let signal, signalMessage;

    if (currentPrice >= pivotPrice && currentPrice <= buyZoneMax) {
        signal = 'BREAKOUT';
        signalMessage = '🔴 VCPブレイクアウト! 買いゾーン内';
    } else if (currentPrice >= pivotPrice) {
        signal = 'EXTENDED';
        signalMessage = '⚫ 買いゾーン超過（様子見）';
    } else if (distanceToPivot <= 3) {
        signal = 'APPROACHING';
        signalMessage = '🟡 ピボットまであと3%以内';
    } else if (qualityScore >= 50) {
        signal = 'FORMING';
        signalMessage = '🟢 高品質VCP形成中';
    } else {
        signal = 'WATCHING';
        signalMessage = '👀 VCPパターン監視中';
    }

    return {
        detected: true,
        pattern: 'VCP',
        signal,
        signalMessage,
        qualityScore,
        currentPrice,
        pivotPrice,
        buyZoneMax,
        distanceToPivot: parseFloat(distanceToPivot.toFixed(2)),
        details: {
            contractionCount,
            lastRangePercent: parseFloat(lastRange.toFixed(2)),
            volumeDryUpRatio: parseFloat(volumeDryUp.toFixed(2)),
            contractions: contractions.slice(-3) // 最新3回の収縮
        }
    };
}

/**
 * カップ・ウィズ・ハンドルとVCPを両方検出して最適なパターンを返す
 * 
 * @param {Array} quotes - 日足データ
 * @param {Function} detectCupWithHandle - カップ・ウィズ・ハンドル検出関数
 * @returns {Object} 最適なパターン検出結果
 */
export function detectBestPattern(quotes, detectCupWithHandle) {
    const cwh = detectCupWithHandle(quotes);
    const vcp = detectVCP(quotes);

    // 両方検出された場合、シグナルが強い方を優先
    const signalPriority = {
        'BREAKOUT': 4,
        'APPROACHING': 3,
        'FORMING': 2,
        'WATCHING': 1,
        'EXTENDED': 0
    };

    if (cwh.detected && vcp.detected) {
        const cwhPriority = signalPriority[cwh.signal] || 0;
        const vcpPriority = signalPriority[vcp.signal] || 0;

        if (vcpPriority >= cwhPriority) {
            return { ...vcp, alternatePattern: cwh };
        }
        return { ...cwh, alternatePattern: vcp };
    }

    if (cwh.detected) return cwh;
    if (vcp.detected) return vcp;

    return {
        detected: false,
        reason: 'パターンが見つかりません'
    };
}
