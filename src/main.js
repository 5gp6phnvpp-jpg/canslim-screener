/**
 * CANSLIM日本株スクリーナー - メインエントリーポイント
 * 
 * 使用方法:
 *   npm run screen          # 通常実行
 *   npm run dev             # 詳細ログ付き実行
 */

// .envファイルから設定を読み込み
import dotenv from 'dotenv';
dotenv.config();

import { getStockList } from './data/fetchStockList.js';
import { getCuratedStockList, getCuratedStockCount } from './data/curatedStockList.js';
import { fetchPriceData, fetchIndexData } from './data/fetchPriceData.js';
import { getEarningsDates } from './data/fetchEarnings.js';
import { runScreening, formatResultsForReport } from './screener.js';
import { sendScreeningReport, sendTestMessage } from './notify/lineNotify.js';
import { saveWebReport } from './web/generateReport.js';
import fs from 'fs/promises';
import path from 'path';

// 環境変数からトークンを取得
const JQUANTS_REFRESH_TOKEN = process.env.JQUANTS_API_TOKEN;
const LINE_CHANNEL_TOKEN = process.env.LINE_CHANNEL_TOKEN;
const LINE_USER_ID = process.env.LINE_USER_ID;

// 設定
const MAX_STOCKS = parseInt(process.env.MAX_STOCKS || '0');  // 0 = 全銘柄
const USE_CURATED_LIST = process.env.USE_CURATED_LIST !== 'false';  // デフォルト: true（厳選銘柄リストを使用）
const VERBOSE = process.argv.includes('--verbose') || process.argv.includes('-v');

/**
 * メイン処理
 */
async function main() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 CANSLIM 日本株スクリーナー');
    console.log(`📅 ${new Date().toLocaleString('ja-JP')}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // トークン確認
    if (!JQUANTS_REFRESH_TOKEN) {
        console.error('❌ JQUANTS_API_TOKEN が設定されていません');
        process.exit(1);
    }

    try {
        // 1. 銘柄リスト取得
        console.log('\n📋 銘柄リスト取得中...');
        let stockList;

        if (USE_CURATED_LIST) {
            // 厳選銘柄リスト（日経225構成銘柄中心）
            stockList = getCuratedStockList();
            console.log(`   ✅ 厳選銘柄リスト使用: ${stockList.length}銘柄（日経225構成銘柄中心）`);
        } else {
            // 全銘柄モード
            stockList = await getStockList(JQUANTS_REFRESH_TOKEN);
            console.log(`   取得完了: ${stockList.length}銘柄`);
        }

        // デバッグ用: 銘柄数制限
        if (MAX_STOCKS > 0) {
            stockList = stockList.slice(0, MAX_STOCKS);
            console.log(`   ⚠️ デバッグモード: ${MAX_STOCKS}銘柄に制限`);
        }

        // 2. 指数データ取得
        console.log('\n📈 指数データ取得中...');
        const indexData = await fetchIndexData();
        console.log(`   TOPIX: ${indexData['TOPIX']?.quotes?.length || 0}日分`);
        console.log(`   日経225: ${indexData['日経225']?.quotes?.length || 0}日分`);

        // 3. 株価データ取得
        console.log('\n💹 株価データ取得中...');
        const codes = stockList.map(s => s.code);
        const priceDataList = await fetchPriceData(codes, (progress) => {
            process.stdout.write(`\r   バッチ ${progress.current}/${progress.total} (${progress.percent}%)`);
        });
        console.log(`\n   取得完了: ${priceDataList.length}銘柄`);

        // 株価データをマップに変換
        const priceDataMap = {};
        for (const data of priceDataList) {
            priceDataMap[data.code] = data;
        }

        // 4. 決算発表予定日取得（J-Quants Freeで利用可能）
        console.log('\n📅 決算発表予定日を確認中...');
        const earningsMap = await getEarningsDates(JQUANTS_REFRESH_TOKEN);

        // 5. スクリーニング実行
        console.log('\n');
        const results = await runScreening(stockList, priceDataMap, indexData, earningsMap);

        // 5. レポート保存
        const reportDir = path.join(process.cwd(), 'reports');
        await fs.mkdir(reportDir, { recursive: true });

        const reportPath = path.join(reportDir, `report_${results.date}.json`);
        await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
        console.log(`\n💾 レポート保存: ${reportPath}`);

        // 6. Webレポート生成
        console.log('\n🌐 Webレポート生成中...');
        await saveWebReport(results);

        // 7. LINE通知
        if (LINE_CHANNEL_TOKEN && LINE_USER_ID) {
            console.log('\n📱 LINE通知送信中...');
            const reportData = formatResultsForReport(results);

            // GitHub PagesダッシュボードURL（ユーザー名部分は環境変数で設定可能）
            const githubUser = process.env.GITHUB_REPOSITORY_OWNER || '5gp6phnvpp-jpg';
            const dashboardUrl = `https://${githubUser}.github.io/canslim-screener/`;

            await sendScreeningReport(LINE_CHANNEL_TOKEN, LINE_USER_ID, reportData, dashboardUrl);
        } else {
            console.log('\n⚠️ LINE通知: トークン未設定のためスキップ');
        }

        // 7. 結果表示
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📋 スクリーニング結果');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        console.log(`\n🚦 マーケット: ${results.marketTrend.status}`);
        console.log(`   ${results.marketTrend.message}`);

        console.log('\n📈 業種ランキングTOP10:');
        results.industryRankings.slice(0, 10).forEach((r, i) => {
            console.log(`   ${i + 1}. ${r.industry} (${r.performance > 0 ? '+' : ''}${r.performance}%)`);
        });

        if (results.candidates.breakouts.length > 0) {
            console.log('\n🔴 ブレイクアウト銘柄:');
            results.candidates.breakouts.forEach(c => {
                console.log(`   ${c.code} ${c.name}`);
                console.log(`      現在値: ¥${c.currentPrice.toLocaleString()} | ピボット: ¥${c.pivotPrice?.toLocaleString()}`);
                console.log(`      出来高: ${Math.round(c.volumeRatio * 100)}% | 業種: ${c.industry}`);
            });
        }

        if (results.candidates.approaching.length > 0) {
            console.log('\n🟡 接近中（TOP5）:');
            results.candidates.approaching.slice(0, 5).forEach(c => {
                console.log(`   ${c.code} ${c.name} - ピボットまで ${c.distanceToPivot}%`);
            });
        }

        console.log('\n✅ 完了!');

    } catch (error) {
        console.error('\n❌ エラー発生:', error.message);
        if (VERBOSE) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// テストモード
if (process.argv.includes('--test-line')) {
    if (!LINE_CHANNEL_TOKEN || !LINE_USER_ID) {
        console.error('❌ LINE_CHANNEL_TOKEN と LINE_USER_ID が必要です');
        process.exit(1);
    }
    console.log('📱 LINEテスト送信中...');
    sendTestMessage(LINE_CHANNEL_TOKEN, LINE_USER_ID)
        .then(() => console.log('✅ テスト送信成功!'))
        .catch(err => console.error('❌ 送信失敗:', err.message));
} else {
    main();
}
