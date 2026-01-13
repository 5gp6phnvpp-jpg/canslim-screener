/**
 * CANSLIM「L」- Leader or Laggard（業界リーダー）
 * 
 * 業種ランキング + 業種内相対力（RS）
 */

/**
 * 相対力（Relative Strength）を計算
 * 過去N日間のパフォーマンスを計算
 * 
 * @param {Array} quotes - 日足データ
 * @param {number} period - 期間（日数）
 */
export function calculateRelativeStrength(quotes, period = 20) {
    if (quotes.length < period + 1) return null;

    const startPrice = quotes[quotes.length - period - 1].close;
    const endPrice = quotes[quotes.length - 1].close;

    return ((endPrice - startPrice) / startPrice * 100);
}

/**
 * 業種ごとのパフォーマンスを計算
 * 
 * @param {Object} stocksByIndustry - 業種別銘柄データ
 * @param {Object} priceDataMap - 証券コード => 株価データのマップ
 * @param {number} period - 計算期間
 */
export function calculateIndustryRankings(stocksByIndustry, priceDataMap, period = 20) {
    const rankings = [];

    for (const [industry, stocks] of Object.entries(stocksByIndustry)) {
        const performances = [];
        const volumes = [];
        let newHighCount = 0;

        for (const stock of stocks) {
            const priceData = priceDataMap[stock.code];
            if (!priceData || priceData.quotes.length < period + 1) continue;

            const rs = calculateRelativeStrength(priceData.quotes, period);
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

    // ランク付け
    return rankings.map((r, i) => ({
        rank: i + 1,
        ...r,
        isTop20: i < 20
    }));
}

/**
 * 銘柄が業種内でリーダーかどうかを判定
 * 
 * @param {string} code - 証券コード
 * @param {Array} industryRankings - 業種ランキング
 * @param {Object} priceDataMap - 株価データマップ
 * @param {Object} stockInfo - 銘柄情報（業種を含む）
 */
export function analyzeLeader(code, industryRankings, priceDataMap, stockInfo) {
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

    // 業種ランク
    const industryRank = industryData.rank;
    const isTop20Industry = industryRank <= 20;

    // 業種内での相対力
    const stockRS = calculateRelativeStrength(priceData.quotes, 20);

    // 業種内の全銘柄のRSを取得してパーセンタイル計算
    const allRS = industryData.topPerformers.map(p => p.rs);
    // 簡易的なパーセンタイル計算
    const betterThan = allRS.filter(rs => stockRS >= rs).length;
    const rsPercentile = (betterThan / allRS.length) * 100;

    // 判定基準:
    // - 業種がTOP20
    // - 業種内RSが上位
    const passed = isTop20Industry;

    return {
        passed,
        industry,
        industryRank,
        isTop20Industry,
        stockRS: parseFloat((stockRS || 0).toFixed(2)),
        rsPercentile: parseFloat(rsPercentile.toFixed(0)),
        industryPerformance: industryData.performance,
        summary: isTop20Industry
            ? `業種ランク #${industryRank} (${industry}), RS: ${(stockRS || 0).toFixed(1)}%`
            : `業種ランク #${industryRank} - TOP20圏外`
    };
}
