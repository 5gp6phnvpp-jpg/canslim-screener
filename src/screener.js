/**
 * メインスクリーニングエンジン
 * 
 * CANSLIM M/S/N/L + カップ・ウィズ・ハンドル/VCPで銘柄を選定
 * + 決算発表予定日による決算リスク判定
 * 
 * IBD方式: 6ヶ月（126日）パフォーマンスで業種ランキング
 * ミネルヴィニ方式: VCP（ボラティリティ収縮パターン）検出
 */

import { analyzeMarketTrend } from './analysis/canslim/marketDirection.js';
import { analyzeSupplyDemand } from './analysis/canslim/supplyDemand.js';
import { analyzeNewHighs } from './analysis/canslim/newHighs.js';
import { analyzeLeader, calculateIndustryRankings, calculateAllStockRS } from './analysis/canslim/leader.js';
import { detectCupWithHandle } from './analysis/chartPatterns/cupWithHandle.js';
import { detectVCP, detectBestPattern } from './analysis/chartPatterns/vcp.js';
import { groupByIndustry } from './data/fetchStockList.js';
import { analyzeEarningsRisk } from './data/fetchEarnings.js';

/**
 * 単一銘柄のCANSLIM分析を実行
 */
function analyzeStock(code, priceData, stockInfo, industryRankings, priceDataMap, earningsMap, sortedRSList = null) {
    const quotes = priceData.quotes;

    if (quotes.length < 50) {
        return null;
    }

    // S: 需給（50日EMA + 出来高）
    const supplyDemand = analyzeSupplyDemand(quotes);
    if (!supplyDemand.passed) {
        return null;  // 50日EMA以下は除外
    }

    // N: 新高値判定
    const newHighs = analyzeNewHighs(quotes);

    // L: 業種リーダー判定（全銘柄RSリストで正確なパーセンタイル計算）
    const leader = analyzeLeader(code, industryRankings, priceDataMap, stockInfo, sortedRSList);

    // チャートパターン: カップ・ウィズ・ハンドル + VCP
    const pattern = detectBestPattern(quotes, detectCupWithHandle);

    // 決算リスク判定
    const earnings = analyzeEarningsRisk(code, earningsMap);

    // スコアリング
    let score = 0;
    const reasons = [];

    // Sスコア（必須条件なのでここに来た時点でパス）
    score += 20;
    reasons.push(`S: ${supplyDemand.summary}`);

    // Nスコア
    if (newHighs.passed) {
        score += 25;
        reasons.push(`N: ${newHighs.summary}`);
    }

    // Lスコア
    if (leader.passed) {
        score += 25;
        reasons.push(`L: ${leader.summary}`);
    }

    // パターンスコア
    if (pattern.detected) {
        score += 30;
        reasons.push(`パターン: ${pattern.signalMessage}`);
    }

    // 決算リスクでスコア調整
    if (earnings.risk === 'HIGH') {
        score -= 15;  // 決算直前はスコアを下げる
        reasons.push(`⚠️ ${earnings.message}`);
    } else if (earnings.risk === 'MEDIUM') {
        score -= 5;
        reasons.push(`📅 ${earnings.message}`);
    }

    // 結果オブジェクト
    // シグナル判定: パターン検出またはN（新高値）状態で判定
    let signal = 'WATCHING';
    let signalMessage = '📊 監視中';

    if (pattern.detected) {
        // パターンが検出された場合はパターンのシグナルを使用
        signal = pattern.signal;
        signalMessage = pattern.signalMessage;
    } else if (newHighs.isAtNewHigh && supplyDemand.volumeRatio >= 1.5) {
        // 52週新高値更新 + 出来高150%以上 = ブレイクアウト
        signal = 'BREAKOUT';
        signalMessage = '🔥 新高値ブレイク！';
    } else if (newHighs.isAtNewHigh) {
        // 52週新高値更新（出来高未確認）
        signal = 'APPROACHING';
        signalMessage = '📈 新高値更新中';
    } else if (newHighs.distanceFromHigh <= 3 && newHighs.passed) {
        // 新高値まで3%以内
        signal = 'FORMING';
        signalMessage = '🎯 新高値接近中';
    }

    return {
        code,
        name: stockInfo.name,
        industry: stockInfo.sector33 || stockInfo.sector17,
        currentPrice: quotes[quotes.length - 1].close,
        score,

        // シグナル情報
        signal,
        signalMessage,

        // ピボット・買いゾーン（新高値の場合は52週高値を使用）
        pivotPrice: pattern.detected ? pattern.pivotPrice : (newHighs.isAtNewHigh ? newHighs.high52Week : null),
        buyZoneMax: pattern.detected ? pattern.buyZoneMax : null,
        distanceToPivot: pattern.detected ? pattern.distanceToPivot : newHighs.distanceFromHigh,

        // 出来高
        volumeRatio: supplyDemand.volumeRatio,
        volumeConfirmed: supplyDemand.volumeConfirmed,

        // 決算リスク
        earningsRisk: earnings.risk,
        earningsMessage: earnings.message,
        earningsDate: earnings.date,

        // 詳細分析結果
        analysis: {
            supplyDemand,
            newHighs,
            leader,
            pattern,
            earnings
        },

        reasons
    };
}

/**
 * メインスクリーニング実行
 * 
 * @param {Array} stockList - 銘柄リスト
 * @param {Object} priceDataMap - 株価データマップ
 * @param {Object} indexData - 指数データ
 * @param {Object} earningsMap - 決算発表予定日マップ（オプション）
 * @returns {Object} スクリーニング結果
 */
export async function runScreening(stockList, priceDataMap, indexData, earningsMap = {}) {
    console.log('🔍 スクリーニング開始...');

    // M: マーケット判定
    const marketTrend = analyzeMarketTrend(indexData);
    console.log(`📊 マーケット状況: ${marketTrend.status} - ${marketTrend.message}`);

    // 業種別にグループ化
    const stocksByIndustry = groupByIndustry(stockList);

    // L: 業種ランキング計算（IBD方式: 6ヶ月パフォーマンス）
    console.log('📈 業種ランキング計算中（IBD方式: 6ヶ月）...');
    const industryRankings = calculateIndustryRankings(stocksByIndustry, priceDataMap);
    console.log(`   TOP3: ${industryRankings.slice(0, 3).map(r => `${r.industry}(RS:${r.rsRating}, ${r.performance}%)`).join(', ')}`);

    // 全銘柄のRS値を計算（パーセンタイルランキング用）
    console.log('📊 銘柄RS Rating計算中（IBD擬似計算式）...');
    const { sortedRSList, count: rsCount } = calculateAllStockRS(stockList, priceDataMap);
    console.log(`   ${rsCount}銘柄のRS値を計算`);

    // 全銘柄を分析
    console.log('🔬 銘柄分析中...');
    const candidates = [];
    let analyzed = 0;
    let passed = 0;
    let earningsWarnings = 0;

    for (const stock of stockList) {
        const priceData = priceDataMap[stock.code];
        if (!priceData) continue;

        analyzed++;

        const result = analyzeStock(
            stock.code,
            priceData,
            stock,
            industryRankings,
            priceDataMap,
            earningsMap,
            sortedRSList
        );

        if (result) {
            passed++;
            candidates.push(result);

            if (result.earningsRisk === 'HIGH' || result.earningsRisk === 'MEDIUM') {
                earningsWarnings++;
            }
        }
    }

    console.log(`   分析完了: ${analyzed}銘柄 → ${passed}銘柄が条件通過`);
    if (earningsWarnings > 0) {
        console.log(`   📅 決算注意銘柄: ${earningsWarnings}銘柄`);
    }

    // スコア順にソート
    candidates.sort((a, b) => {
        // まずシグナル優先度
        const signalOrder = { 'BREAKOUT': 0, 'APPROACHING': 1, 'FORMING': 2, 'WATCHING': 3 };
        const signalDiff = (signalOrder[a.signal] || 9) - (signalOrder[b.signal] || 9);
        if (signalDiff !== 0) return signalDiff;

        // 次にスコア
        return b.score - a.score;
    });

    // シグナル別に分類
    const breakouts = candidates.filter(c => c.signal === 'BREAKOUT');
    const approaching = candidates.filter(c => c.signal === 'APPROACHING');
    const forming = candidates.filter(c => c.signal === 'FORMING');

    console.log(`\n📋 結果サマリー:`);
    console.log(`   🔴 ブレイクアウト: ${breakouts.length}銘柄`);
    console.log(`   🟡 接近中: ${approaching.length}銘柄`);
    console.log(`   🟢 形成中: ${forming.length}銘柄`);

    return {
        date: new Date().toISOString().split('T')[0],
        marketTrend,
        industryRankings,
        summary: {
            totalAnalyzed: analyzed,
            totalPassed: passed,
            breakouts: breakouts.length,
            approaching: approaching.length,
            forming: forming.length,
            earningsWarnings
        },
        candidates: {
            breakouts,
            approaching,
            forming,
            all: candidates
        }
    };
}

/**
 * 結果をJSON形式で保存
 */
export function formatResultsForReport(results) {
    const { marketTrend, industryRankings, candidates } = results;

    // LINE通知用にフォーマット
    return {
        date: results.date,
        marketData: marketTrend,
        industryRankings: industryRankings.slice(0, 20),
        candidates: [
            ...candidates.breakouts,
            ...candidates.approaching.slice(0, 5),
            ...candidates.forming.slice(0, 5)
        ]
    };
}
