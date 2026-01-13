/**
 * 銘柄リスト取得モジュール
 * 
 * 優先順位:
 * 1. キャッシュ（1日以内）
 * 2. J-Quants API V2
 * 3. 東証公式サイト（Excelファイル）
 * 4. 内蔵の日経225リスト（フォールバック）
 */

import axios from 'axios';
import * as XLSX from 'xlsx';
import fs from 'fs/promises';
import path from 'path';

// 東証の上場銘柄一覧URL（最新データ）
const JPX_STOCK_LIST_URL = 'https://www.jpx.co.jp/markets/statistics-equities/misc/tvdivq0000001vg2-att/data_j.xls';

// 日経225 主要銘柄（フォールバック用）
const NIKKEI_225_SAMPLE = [
    { code: '7203', name: 'トヨタ自動車', sector33: '輸送用機器' },
    { code: '6758', name: 'ソニーグループ', sector33: '電気機器' },
    { code: '9984', name: 'ソフトバンクグループ', sector33: '情報・通信業' },
    { code: '8306', name: '三菱UFJフィナンシャル・グループ', sector33: '銀行業' },
    { code: '6861', name: 'キーエンス', sector33: '電気機器' },
    { code: '9432', name: '日本電信電話', sector33: '情報・通信業' },
    { code: '6902', name: 'デンソー', sector33: '輸送用機器' },
    { code: '7267', name: '本田技研工業', sector33: '輸送用機器' },
    { code: '4063', name: '信越化学工業', sector33: '化学' },
    { code: '8058', name: '三菱商事', sector33: '卸売業' },
    { code: '6501', name: '日立製作所', sector33: '電気機器' },
    { code: '9433', name: 'KDDI', sector33: '情報・通信業' },
    { code: '6367', name: 'ダイキン工業', sector33: '機械' },
    { code: '4502', name: '武田薬品工業', sector33: '医薬品' },
    { code: '6954', name: 'ファナック', sector33: '電気機器' },
    { code: '7974', name: '任天堂', sector33: 'その他製品' },
    { code: '6098', name: 'リクルートホールディングス', sector33: 'サービス業' },
    { code: '8035', name: '東京エレクトロン', sector33: '電気機器' },
    { code: '9983', name: 'ファーストリテイリング', sector33: '小売業' },
    { code: '8766', name: '東京海上ホールディングス', sector33: '保険業' },
    { code: '7741', name: 'HOYA', sector33: '精密機器' },
    { code: '6594', name: '日本電産', sector33: '電気機器' },
    { code: '4568', name: '第一三共', sector33: '医薬品' },
    { code: '6503', name: '三菱電機', sector33: '電気機器' },
    { code: '4519', name: '中外製薬', sector33: '医薬品' },
    { code: '6857', name: 'アドバンテスト', sector33: '電気機器' },
    { code: '8031', name: '三井物産', sector33: '卸売業' },
    { code: '2914', name: '日本たばこ産業', sector33: '食料品' },
    { code: '4503', name: 'アステラス製薬', sector33: '医薬品' },
    { code: '7751', name: 'キヤノン', sector33: '電気機器' },
];

/**
 * 東証公式サイトから銘柄リストを取得
 */
async function fetchFromJPX() {
    console.log('📡 東証（JPX）から銘柄リストをダウンロード中...');

    try {
        const response = await axios.get(JPX_STOCK_LIST_URL, {
            responseType: 'arraybuffer',
            timeout: 30000
        });

        const workbook = XLSX.read(response.data, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        console.log(`   取得した生データ: ${data.length}件`);

        // データをパース（東証のExcel形式に合わせる）
        const stocks = data
            .filter(row => {
                const code = String(row['コード'] || row['銘柄コード'] || '');
                const market = String(row['市場・商品区分'] || row['市場区分'] || '');

                // 4桁の証券コードのみ（ETF等を除外）
                const isValidCode = /^\d{4}$/.test(code);
                // プライム、スタンダード、グロース市場のみ
                const isValidMarket = market.includes('プライム') ||
                    market.includes('スタンダード') ||
                    market.includes('グロース');

                return isValidCode && isValidMarket;
            })
            .map(row => ({
                code: String(row['コード'] || row['銘柄コード']),
                name: String(row['銘柄名'] || row['会社名'] || ''),
                market: String(row['市場・商品区分'] || row['市場区分'] || ''),
                sector33: String(row['33業種区分'] || row['業種'] || ''),
                sector17: String(row['17業種区分'] || '')
            }));

        console.log(`   フィルタ後: ${stocks.length}件（プライム/スタンダード/グロース）`);

        return stocks;
    } catch (error) {
        console.log(`   ⚠️ JPXからの取得に失敗: ${error.message}`);
        return null;
    }
}

/**
 * J-Quants APIから銘柄リストを取得（オプション）
 */
async function fetchFromJQuants(apiKey) {
    if (!apiKey) return null;

    try {
        console.log('📡 J-Quants API V2から銘柄リストを取得中...');
        // ベースURL: api.jquants.com（jpx-なし）
        const response = await axios.get('https://api.jquants.com/v2/equities/master', {
            headers: { 'x-api-key': apiKey },
            timeout: 10000
        });

        const stocks = response.data.equities || response.data.info || [];
        if (stocks.length > 0) {
            console.log(`   ✅ ${stocks.length}件取得成功`);
            return stocks.map(stock => ({
                code: stock.Code || stock.code || stock.local_code,
                name: stock.CompanyName || stock.company_name,
                market: stock.MarketCodeName || stock.market_code_name,
                sector33: stock.Sector33CodeName || stock.sector33_code_name,
                sector17: stock.Sector17CodeName || stock.sector17_code_name
            }));
        }
    } catch (error) {
        console.log(`   ⚠️ J-Quants API使用不可: ${error.response?.status || error.message}`);
    }
    return null;
}

/**
 * キャッシュ操作
 */
async function saveStockListCache(stocks) {
    const cacheDir = path.join(process.cwd(), 'data');
    await fs.mkdir(cacheDir, { recursive: true });

    const cachePath = path.join(cacheDir, 'stock_list.json');
    await fs.writeFile(cachePath, JSON.stringify({
        updatedAt: new Date().toISOString(),
        count: stocks.length,
        stocks
    }, null, 2));

    console.log(`✅ 銘柄リストを保存しました: ${stocks.length}件`);
}

async function loadStockListCache() {
    const cachePath = path.join(process.cwd(), 'data', 'stock_list.json');

    try {
        const content = await fs.readFile(cachePath, 'utf-8');
        const cache = JSON.parse(content);

        const updatedAt = new Date(cache.updatedAt);
        const now = new Date();
        const hoursSinceUpdate = (now - updatedAt) / (1000 * 60 * 60);

        if (hoursSinceUpdate < 24) {
            console.log(`📦 キャッシュから銘柄リストを読み込み: ${cache.count}件`);
            return cache.stocks;
        }
    } catch (error) {
        // キャッシュなし
    }

    return null;
}

/**
 * メインの銘柄リスト取得関数
 */
export async function getStockList(apiKey) {
    // 1. キャッシュ確認
    const cached = await loadStockListCache();
    if (cached && cached.length > 100) {
        return cached;
    }

    // 2. J-Quants APIを試す
    const jquantsStocks = await fetchFromJQuants(apiKey);
    if (jquantsStocks && jquantsStocks.length > 100) {
        await saveStockListCache(jquantsStocks);
        return jquantsStocks;
    }

    // 3. 東証公式サイトから取得
    const jpxStocks = await fetchFromJPX();
    if (jpxStocks && jpxStocks.length > 100) {
        await saveStockListCache(jpxStocks);
        return jpxStocks;
    }

    // 4. フォールバック: 内蔵リスト
    console.log('📋 フォールバック: 内蔵銘柄リスト（日経225 主要30銘柄）を使用');
    const stocks = NIKKEI_225_SAMPLE.map(s => ({
        ...s,
        market: 'プライム',
        sector17: s.sector33
    }));

    return stocks;
}

/**
 * 業種別に銘柄をグループ化
 */
export function groupByIndustry(stocks) {
    const groups = {};

    for (const stock of stocks) {
        const industry = stock.sector33 || stock.sector17 || '不明';
        if (!groups[industry]) {
            groups[industry] = [];
        }
        groups[industry].push(stock);
    }

    return groups;
}
