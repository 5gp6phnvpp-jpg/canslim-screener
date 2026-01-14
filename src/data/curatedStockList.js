/**
 * 厳選銘柄リスト
 * 
 * 日経225構成銘柄 + TOPIX Core30 + 主要グロース銘柄
 * Stooq.comで確実に取得できる銘柄を厳選
 * 
 * 特徴:
 * - 流動性の高い銘柄のみ（CANSLIM投資に最適）
 * - レート制限なし
 * - 安定動作
 */

// 日経225構成銘柄（2024年版）+ 主要銘柄
export const CURATED_STOCK_LIST = [
    // === 電気機器 ===
    { code: '6758', name: 'ソニーグループ', sector33: '電気機器' },
    { code: '6861', name: 'キーエンス', sector33: '電気機器' },
    { code: '6501', name: '日立製作所', sector33: '電気機器' },
    { code: '6954', name: 'ファナック', sector33: '電気機器' },
    { code: '8035', name: '東京エレクトロン', sector33: '電気機器' },
    { code: '6594', name: '日本電産', sector33: '電気機器' },
    { code: '6503', name: '三菱電機', sector33: '電気機器' },
    { code: '6857', name: 'アドバンテスト', sector33: '電気機器' },
    { code: '7751', name: 'キヤノン', sector33: '電気機器' },
    { code: '6702', name: '富士通', sector33: '電気機器' },
    { code: '6506', name: '安川電機', sector33: '電気機器' },
    { code: '6645', name: 'オムロン', sector33: '電気機器' },
    { code: '6762', name: 'TDK', sector33: '電気機器' },
    { code: '6971', name: '京セラ', sector33: '電気機器' },
    { code: '6752', name: 'パナソニック', sector33: '電気機器' },
    { code: '6724', name: 'セイコーエプソン', sector33: '電気機器' },
    { code: '6504', name: '富士電機', sector33: '電気機器' },
    { code: '6701', name: 'NEC', sector33: '電気機器' },
    { code: '6479', name: 'ミネベアミツミ', sector33: '電気機器' },
    { code: '6753', name: 'シャープ', sector33: '電気機器' },
    { code: '6988', name: '日東電工', sector33: '電気機器' },
    { code: '6981', name: '村田製作所', sector33: '電気機器' },
    { code: '6902', name: 'デンソー', sector33: '電気機器' },
    { code: '6146', name: 'ディスコ', sector33: '電気機器' },
    { code: '6723', name: 'ルネサスエレクトロニクス', sector33: '電気機器' },

    // === 輸送用機器 ===
    { code: '7203', name: 'トヨタ自動車', sector33: '輸送用機器' },
    { code: '7267', name: '本田技研工業', sector33: '輸送用機器' },
    { code: '7261', name: 'マツダ', sector33: '輸送用機器' },
    { code: '7269', name: 'スズキ', sector33: '輸送用機器' },
    { code: '7270', name: 'SUBARU', sector33: '輸送用機器' },
    { code: '7201', name: '日産自動車', sector33: '輸送用機器' },
    { code: '7272', name: 'ヤマハ発動機', sector33: '輸送用機器' },
    { code: '7211', name: '三菱自動車工業', sector33: '輸送用機器' },
    { code: '7259', name: 'アイシン', sector33: '輸送用機器' },
    { code: '7205', name: '日野自動車', sector33: '輸送用機器' },

    // === 情報・通信業 ===
    { code: '9984', name: 'ソフトバンクグループ', sector33: '情報・通信業' },
    { code: '9432', name: '日本電信電話', sector33: '情報・通信業' },
    { code: '9433', name: 'KDDI', sector33: '情報・通信業' },
    { code: '9434', name: 'ソフトバンク', sector33: '情報・通信業' },
    { code: '4689', name: 'LINEヤフー', sector33: '情報・通信業' },
    { code: '4755', name: '楽天グループ', sector33: '情報・通信業' },
    { code: '3774', name: 'インターネットイニシアティブ', sector33: '情報・通信業' },
    { code: '9613', name: 'NTTデータグループ', sector33: '情報・通信業' },
    { code: '2413', name: 'エムスリー', sector33: '情報・通信業' },
    { code: '4307', name: '野村総合研究所', sector33: '情報・通信業' },
    { code: '9449', name: 'GMOインターネットグループ', sector33: '情報・通信業' },

    // === 医薬品 ===
    { code: '4502', name: '武田薬品工業', sector33: '医薬品' },
    { code: '4568', name: '第一三共', sector33: '医薬品' },
    { code: '4519', name: '中外製薬', sector33: '医薬品' },
    { code: '4503', name: 'アステラス製薬', sector33: '医薬品' },
    { code: '4578', name: '大塚ホールディングス', sector33: '医薬品' },
    { code: '4506', name: '住友ファーマ', sector33: '医薬品' },
    { code: '4507', name: '塩野義製薬', sector33: '医薬品' },
    { code: '4523', name: 'エーザイ', sector33: '医薬品' },
    { code: '4516', name: '日本新薬', sector33: '医薬品' },
    { code: '4151', name: '協和キリン', sector33: '医薬品' },

    // === 銀行業 ===
    { code: '8306', name: '三菱UFJフィナンシャル・グループ', sector33: '銀行業' },
    { code: '8316', name: '三井住友フィナンシャルグループ', sector33: '銀行業' },
    { code: '8411', name: 'みずほフィナンシャルグループ', sector33: '銀行業' },
    { code: '8308', name: 'りそなホールディングス', sector33: '銀行業' },
    { code: '7186', name: 'コンコルディア・フィナンシャルグループ', sector33: '銀行業' },
    { code: '8354', name: 'ふくおかフィナンシャルグループ', sector33: '銀行業' },
    { code: '8309', name: '三井住友トラスト・ホールディングス', sector33: '銀行業' },

    // === 卸売業 ===
    { code: '8058', name: '三菱商事', sector33: '卸売業' },
    { code: '8031', name: '三井物産', sector33: '卸売業' },
    { code: '8001', name: '伊藤忠商事', sector33: '卸売業' },
    { code: '8053', name: '住友商事', sector33: '卸売業' },
    { code: '8002', name: '丸紅', sector33: '卸売業' },
    { code: '8015', name: '豊田通商', sector33: '卸売業' },
    { code: '2768', name: '双日', sector33: '卸売業' },

    // === 化学 ===
    { code: '4063', name: '信越化学工業', sector33: '化学' },
    { code: '4188', name: '三菱ケミカルグループ', sector33: '化学' },
    { code: '4005', name: '住友化学', sector33: '化学' },
    { code: '4183', name: '三井化学', sector33: '化学' },
    { code: '4004', name: '昭和電工', sector33: '化学' },
    { code: '4021', name: '日産化学', sector33: '化学' },
    { code: '4911', name: '資生堂', sector33: '化学' },
    { code: '4452', name: '花王', sector33: '化学' },
    { code: '6920', name: 'レーザーテック', sector33: '化学' },

    // === 機械 ===
    { code: '6367', name: 'ダイキン工業', sector33: '機械' },
    { code: '6301', name: '小松製作所', sector33: '機械' },
    { code: '6302', name: '住友重機械工業', sector33: '機械' },
    { code: '6305', name: '日立建機', sector33: '機械' },
    { code: '6326', name: 'クボタ', sector33: '機械' },
    { code: '6361', name: '荏原製作所', sector33: '機械' },
    { code: '6471', name: '日本精工', sector33: '機械' },
    { code: '7011', name: '三菱重工業', sector33: '機械' },
    { code: '7012', name: '川崎重工業', sector33: '機械' },
    { code: '7013', name: 'IHI', sector33: '機械' },

    // === 小売業 ===
    { code: '9983', name: 'ファーストリテイリング', sector33: '小売業' },
    { code: '3382', name: 'セブン&アイ・ホールディングス', sector33: '小売業' },
    { code: '8267', name: 'イオン', sector33: '小売業' },
    { code: '9843', name: 'ニトリホールディングス', sector33: '小売業' },
    { code: '3099', name: '三越伊勢丹ホールディングス', sector33: '小売業' },
    { code: '8252', name: '丸井グループ', sector33: '小売業' },

    // === サービス業 ===
    { code: '6098', name: 'リクルートホールディングス', sector33: 'サービス業' },
    { code: '4661', name: 'オリエンタルランド', sector33: 'サービス業' },
    { code: '9602', name: '東宝', sector33: 'サービス業' },
    { code: '2181', name: 'パーソルホールディングス', sector33: 'サービス業' },
    { code: '6178', name: '日本郵政', sector33: 'サービス業' },

    // === 保険業 ===
    { code: '8766', name: '東京海上ホールディングス', sector33: '保険業' },
    { code: '8725', name: 'MS&ADインシュアランスグループホールディングス', sector33: '保険業' },
    { code: '8630', name: 'SOMPOホールディングス', sector33: '保険業' },
    { code: '8750', name: '第一生命ホールディングス', sector33: '保険業' },
    { code: '7181', name: 'かんぽ生命保険', sector33: '保険業' },

    // === 精密機器 ===
    { code: '7741', name: 'HOYA', sector33: '精密機器' },
    { code: '4543', name: 'テルモ', sector33: '精密機器' },
    { code: '7733', name: 'オリンパス', sector33: '精密機器' },
    { code: '7735', name: 'SCREEN ホールディングス', sector33: '精密機器' },
    { code: '7731', name: 'ニコン', sector33: '精密機器' },

    // === 不動産業 ===
    { code: '8801', name: '三井不動産', sector33: '不動産業' },
    { code: '8802', name: '三菱地所', sector33: '不動産業' },
    { code: '8830', name: '住友不動産', sector33: '不動産業' },
    { code: '3289', name: '東急不動産ホールディングス', sector33: '不動産業' },
    { code: '8804', name: '東京建物', sector33: '不動産業' },

    // === 食料品 ===
    { code: '2914', name: '日本たばこ産業', sector33: '食料品' },
    { code: '2501', name: 'サッポロホールディングス', sector33: '食料品' },
    { code: '2502', name: 'アサヒグループホールディングス', sector33: '食料品' },
    { code: '2503', name: 'キリンホールディングス', sector33: '食料品' },
    { code: '2801', name: 'キッコーマン', sector33: '食料品' },
    { code: '2802', name: '味の素', sector33: '食料品' },
    { code: '2269', name: '明治ホールディングス', sector33: '食料品' },
    { code: '2282', name: '日本ハム', sector33: '食料品' },

    // === 鉄鋼 ===
    { code: '5401', name: '日本製鉄', sector33: '鉄鋼' },
    { code: '5411', name: 'JFEホールディングス', sector33: '鉄鋼' },
    { code: '5406', name: '神戸製鋼所', sector33: '鉄鋼' },

    // === 非鉄金属 ===
    { code: '5713', name: '住友金属鉱山', sector33: '非鉄金属' },
    { code: '5711', name: '三菱マテリアル', sector33: '非鉄金属' },
    { code: '5802', name: '住友電気工業', sector33: '非鉄金属' },
    { code: '5803', name: 'フジクラ', sector33: '非鉄金属' },

    // === 陸運業 ===
    { code: '9020', name: 'JR東日本', sector33: '陸運業' },
    { code: '9021', name: 'JR西日本', sector33: '陸運業' },
    { code: '9022', name: 'JR東海', sector33: '陸運業' },
    { code: '9005', name: '東急', sector33: '陸運業' },
    { code: '9001', name: '東武鉄道', sector33: '陸運業' },
    { code: '9007', name: '小田急電鉄', sector33: '陸運業' },
    { code: '9009', name: '京成電鉄', sector33: '陸運業' },
    { code: '9064', name: 'ヤマトホールディングス', sector33: '陸運業' },
    { code: '9143', name: 'SGホールディングス', sector33: '陸運業' },

    // === 海運業 ===
    { code: '9101', name: '日本郵船', sector33: '海運業' },
    { code: '9104', name: '商船三井', sector33: '海運業' },
    { code: '9107', name: '川崎汽船', sector33: '海運業' },

    // === 空運業 ===
    { code: '9202', name: 'ANAホールディングス', sector33: '空運業' },
    { code: '9201', name: '日本航空', sector33: '空運業' },

    // === 電気・ガス業 ===
    { code: '9501', name: '東京電力ホールディングス', sector33: '電気・ガス業' },
    { code: '9502', name: '中部電力', sector33: '電気・ガス業' },
    { code: '9503', name: '関西電力', sector33: '電気・ガス業' },
    { code: '9531', name: '東京ガス', sector33: '電気・ガス業' },
    { code: '9532', name: '大阪ガス', sector33: '電気・ガス業' },

    // === 建設業 ===
    { code: '1801', name: '大成建設', sector33: '建設業' },
    { code: '1802', name: '大林組', sector33: '建設業' },
    { code: '1803', name: '清水建設', sector33: '建設業' },
    { code: '1808', name: '長谷工コーポレーション', sector33: '建設業' },
    { code: '1812', name: '鹿島建設', sector33: '建設業' },
    { code: '1925', name: '大和ハウス工業', sector33: '建設業' },
    { code: '1928', name: '積水ハウス', sector33: '建設業' },

    // === ガラス・土石製品 ===
    { code: '5201', name: 'AGC', sector33: 'ガラス・土石製品' },
    { code: '5232', name: '住友大阪セメント', sector33: 'ガラス・土石製品' },
    { code: '5233', name: '太平洋セメント', sector33: 'ガラス・土石製品' },

    // === ゴム製品 ===
    { code: '5108', name: 'ブリヂストン', sector33: 'ゴム製品' },
    { code: '5101', name: '横浜ゴム', sector33: 'ゴム製品' },

    // === その他製品 ===
    { code: '7974', name: '任天堂', sector33: 'その他製品' },
    { code: '4902', name: 'コニカミノルタ', sector33: 'その他製品' },
    { code: '7762', name: 'シチズン時計', sector33: 'その他製品' },
    { code: '7936', name: 'アシックス', sector33: 'その他製品' },
    { code: '7832', name: 'バンダイナムコホールディングス', sector33: 'その他製品' },

    // === 証券、商品先物取引業 ===
    { code: '8604', name: '野村ホールディングス', sector33: '証券、商品先物取引業' },
    { code: '8601', name: '大和証券グループ本社', sector33: '証券、商品先物取引業' },

    // === その他金融業 ===
    { code: '8591', name: 'オリックス', sector33: 'その他金融業' },
    { code: '8697', name: '日本取引所グループ', sector33: 'その他金融業' },
    { code: '8795', name: 'T&Dホールディングス', sector33: 'その他金融業' },

    // === 繊維製品 ===
    { code: '3401', name: '帝人', sector33: '繊維製品' },
    { code: '3402', name: '東レ', sector33: '繊維製品' },

    // === パルプ・紙 ===
    { code: '3861', name: '王子ホールディングス', sector33: 'パルプ・紙' },
    { code: '3863', name: '日本製紙', sector33: 'パルプ・紙' },

    // === 石油・石炭製品 ===
    { code: '5019', name: '出光興産', sector33: '石油・石炭製品' },
    { code: '5020', name: 'ENEOSホールディングス', sector33: '石油・石炭製品' },

    // === 金属製品 ===
    { code: '5631', name: '日本製鋼所', sector33: '金属製品' },
];

/**
 * 厳選銘柄リストを取得
 */
export function getCuratedStockList() {
    return CURATED_STOCK_LIST.map(stock => ({
        ...stock,
        market: 'プライム',
        sector17: stock.sector33
    }));
}

/**
 * 銘柄数を取得
 */
export function getCuratedStockCount() {
    return CURATED_STOCK_LIST.length;
}
