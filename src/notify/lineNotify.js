/**
 * LINE Messaging API 通知モジュール
 * 
 * Flex Message形式でリッチな通知を送信
 */

import axios from 'axios';

const LINE_API_BASE = 'https://api.line.me/v2/bot';

/**
 * テキストメッセージを送信
 */
export async function sendTextMessage(channelToken, userId, text) {
    await axios.post(
        `${LINE_API_BASE}/message/push`,
        {
            to: userId,
            messages: [{ type: 'text', text }]
        },
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${channelToken}`
            }
        }
    );
}

/**
 * マーケット状況カードを生成
 */
function createMarketCard(marketData) {
    const statusEmoji = {
        'CONFIRMED': '✅',
        'UNDER_PRESSURE': '⚠️',
        'CORRECTION': '🚫',
        'UNKNOWN': '❓'
    };

    const statusColor = {
        'CONFIRMED': '#00C851',
        'UNDER_PRESSURE': '#ffbb33',
        'CORRECTION': '#ff4444',
        'UNKNOWN': '#9e9e9e'
    };

    return {
        type: 'bubble',
        size: 'kilo',
        header: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: '🚦 マーケット状況',
                    weight: 'bold',
                    size: 'md',
                    color: '#ffffff'
                }
            ],
            backgroundColor: statusColor[marketData.status] || '#9e9e9e',
            paddingAll: '15px'
        },
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: `${statusEmoji[marketData.status]} ${marketData.status}`,
                    weight: 'bold',
                    size: 'lg'
                },
                {
                    type: 'text',
                    text: marketData.message,
                    size: 'sm',
                    color: '#666666',
                    margin: 'md',
                    wrap: true
                },
                {
                    type: 'separator',
                    margin: 'lg'
                },
                {
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'md',
                    contents: [
                        { type: 'text', text: 'ディストリビューション', size: 'xs', color: '#888888', flex: 3 },
                        { type: 'text', text: `${marketData.details?.distributionDays || 0}日`, size: 'xs', align: 'end', flex: 1 }
                    ]
                }
            ],
            paddingAll: '15px'
        }
    };
}

/**
 * 業種ランキングカードを生成
 */
function createIndustryCard(rankings) {
    const top5 = rankings.slice(0, 5);

    const rankItems = top5.map((r, i) => ({
        type: 'box',
        layout: 'horizontal',
        contents: [
            { type: 'text', text: `${i + 1}.`, size: 'sm', flex: 1 },
            { type: 'text', text: r.industry, size: 'sm', flex: 4 },
            { type: 'text', text: `${r.performance > 0 ? '+' : ''}${r.performance}%`, size: 'sm', align: 'end', flex: 2, color: r.performance > 0 ? '#00C851' : '#ff4444' }
        ],
        margin: 'sm'
    }));

    return {
        type: 'bubble',
        size: 'kilo',
        header: {
            type: 'box',
            layout: 'vertical',
            contents: [
                { type: 'text', text: '📈 業種ランキングTOP5', weight: 'bold', size: 'md', color: '#ffffff' }
            ],
            backgroundColor: '#1a73e8',
            paddingAll: '15px'
        },
        body: {
            type: 'box',
            layout: 'vertical',
            contents: rankItems,
            paddingAll: '15px'
        }
    };
}

/**
 * 銘柄カードを生成
 */
function createStockCard(stock) {
    const signalColor = {
        'BREAKOUT': '#ff4444',
        'APPROACHING': '#ffbb33',
        'FORMING': '#00C851',
        'EXTENDED': '#9e9e9e'
    };

    const signalEmoji = {
        'BREAKOUT': '🔴',
        'APPROACHING': '🟡',
        'FORMING': '🟢',
        'EXTENDED': '⚫'
    };

    return {
        type: 'bubble',
        size: 'kilo',
        header: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: `${stock.code} ${stock.name}`,
                    weight: 'bold',
                    size: 'sm',
                    color: '#ffffff',
                    wrap: true
                }
            ],
            backgroundColor: signalColor[stock.signal] || '#9e9e9e',
            paddingAll: '12px'
        },
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: `${signalEmoji[stock.signal]} ${stock.signalMessage}`,
                    weight: 'bold',
                    size: 'sm'
                },
                // 決算リスク警告
                ...(stock.earningsRisk === 'HIGH' || stock.earningsRisk === 'MEDIUM' ? [{
                    type: 'text',
                    text: stock.earningsMessage || '決算注意',
                    size: 'xs',
                    color: stock.earningsRisk === 'HIGH' ? '#ff4444' : '#ffbb33',
                    margin: 'sm'
                }] : []),
                {
                    type: 'separator',
                    margin: 'md'
                },
                {
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'md',
                    contents: [
                        { type: 'text', text: '現在値', size: 'xs', color: '#888888', flex: 2 },
                        { type: 'text', text: `¥${stock.currentPrice?.toLocaleString() || '-'}`, size: 'xs', align: 'end', flex: 3 }
                    ]
                },
                {
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'sm',
                    contents: [
                        { type: 'text', text: 'ピボット', size: 'xs', color: '#888888', flex: 2 },
                        { type: 'text', text: `¥${stock.pivotPrice?.toLocaleString() || '-'}`, size: 'xs', align: 'end', flex: 3 }
                    ]
                },
                {
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'sm',
                    contents: [
                        { type: 'text', text: '出来高', size: 'xs', color: '#888888', flex: 2 },
                        { type: 'text', text: `${stock.volumeRatio ? Math.round(stock.volumeRatio * 100) : '-'}%`, size: 'xs', align: 'end', flex: 3, color: stock.volumeRatio >= 1.4 ? '#00C851' : '#888888' }
                    ]
                },
                {
                    type: 'box',
                    layout: 'horizontal',
                    margin: 'sm',
                    contents: [
                        { type: 'text', text: '業種', size: 'xs', color: '#888888', flex: 2 },
                        { type: 'text', text: stock.industry || '-', size: 'xs', align: 'end', flex: 3 }
                    ]
                }
            ],
            paddingAll: '12px'
        },
        footer: {
            type: 'box',
            layout: 'horizontal',
            contents: [
                {
                    type: 'button',
                    action: {
                        type: 'uri',
                        label: 'チャート',
                        uri: `https://www.tradingview.com/symbols/TSE-${stock.code}/`
                    },
                    height: 'sm',
                    style: 'link'
                }
            ],
            paddingAll: '10px'
        }
    };
}

/**
 * スクリーニングレポートを送信
 * 
 * @param {string} channelToken - LINEチャネルアクセストークン
 * @param {string} userId - 送信先ユーザーID
 * @param {Object} report - レポートデータ
 */
export async function sendScreeningReport(channelToken, userId, report) {
    const { date, marketData, industryRankings, candidates } = report;

    const bubbles = [];

    // 1. マーケット状況カード
    bubbles.push(createMarketCard(marketData));

    // 2. 業種ランキングカード
    if (industryRankings && industryRankings.length > 0) {
        bubbles.push(createIndustryCard(industryRankings));
    }

    // 3. 銘柄カード（最大8銘柄）
    const stockCards = candidates.slice(0, 8).map(createStockCard);
    bubbles.push(...stockCards);

    // Carousel形式で送信
    const flexMessage = {
        type: 'flex',
        altText: `📊 CANSLIM レポート ${date}`,
        contents: {
            type: 'carousel',
            contents: bubbles
        }
    };

    await axios.post(
        `${LINE_API_BASE}/message/push`,
        {
            to: userId,
            messages: [flexMessage]
        },
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${channelToken}`
            }
        }
    );

    console.log(`✅ LINE通知を送信しました: ${candidates.length}銘柄`);
}

/**
 * テスト通知を送信
 */
export async function sendTestMessage(channelToken, userId) {
    await sendTextMessage(
        channelToken,
        userId,
        '🔔 CANSLIM スクリーナー接続テスト成功！\n\n毎日18時にスクリーニング結果をお届けします。'
    );
}
