/**
 * カップ・ウィズ・ハンドル（Cup with Handle）パターン検出
 * 
 * IBD/CANSLIM投資法の核心となるチャートパターン
 * 
 * パターン構成:
 * - カップ部分: 7週間以上のベース形成、深さ12-33%
 * - ハンドル部分: 1-2週間の調整、深さ8-12%
 * - ピボットポイント: ハンドル最高値 + 0.1%
 */

/**
 * ローカルの高値・安値を検出
 */
function findLocalExtremes(quotes, windowSize = 5) {
    const highs = [];
    const lows = [];

    for (let i = windowSize; i < quotes.length - windowSize; i++) {
        const window = quotes.slice(i - windowSize, i + windowSize + 1);
        const current = quotes[i];

        // ローカル高値
        if (current.high >= Math.max(...window.map(q => q.high))) {
            highs.push({ index: i, price: current.high, date: current.date });
        }

        // ローカル安値
        if (current.low <= Math.min(...window.map(q => q.low))) {
            lows.push({ index: i, price: current.low, date: current.date });
        }
    }

    return { highs, lows };
}

/**
 * カップパターンを検出
 * 
 * @param {Array} quotes - 日足データ（60日以上推奨）
 * @param {Object} params - パラメータ
 */
function detectCup(quotes, params = {}) {
    const {
        minBaseDays = 35,        // 最低7週間
        maxBaseDays = 150,       // 最大約30週間
        minCupDepth = 12,        // 最小深さ12%
        maxCupDepth = 33,        // 最大深さ33%
    } = params;

    if (quotes.length < minBaseDays) {
        return null;
    }

    const { highs, lows } = findLocalExtremes(quotes, 3);

    if (highs.length < 2 || lows.length < 1) {
        return null;
    }

    // カップの左側高値を探す（ベースの開始点）
    // 最近の高値から遡って、十分な期間前の高値を探す
    const recentHighIdx = quotes.length - 1;

    for (let i = highs.length - 1; i >= 0; i--) {
        const leftHigh = highs[i];

        // 左側高値から現在までの期間
        const baseDays = recentHighIdx - leftHigh.index;

        if (baseDays < minBaseDays || baseDays > maxBaseDays) {
            continue;
        }

        // この期間内の最安値（カップの底）
        const cupRange = quotes.slice(leftHigh.index, recentHighIdx + 1);
        const cupBottom = Math.min(...cupRange.map(q => q.low));
        const cupBottomIdx = cupRange.findIndex(q => q.low === cupBottom) + leftHigh.index;

        // カップの深さを計算
        const cupDepth = ((leftHigh.price - cupBottom) / leftHigh.price) * 100;

        if (cupDepth < minCupDepth || cupDepth > maxCupDepth) {
            continue;
        }

        // 右側高値（カップの右端、ハンドル開始前）
        // 底から現在までの間で最も高い点を探す
        const rightRange = quotes.slice(cupBottomIdx, recentHighIdx + 1);
        const rightHigh = Math.max(...rightRange.map(q => q.high));
        const rightHighIdx = rightRange.findIndex(q => q.high === rightHigh) + cupBottomIdx;

        // 右側高値が左側高値に近いことを確認（U字型）
        const rightLeftRatio = rightHigh / leftHigh.price;
        if (rightLeftRatio < 0.85 || rightLeftRatio > 1.05) {
            // 右側が低すぎるか高すぎる
            continue;
        }

        return {
            detected: true,
            leftHigh: {
                index: leftHigh.index,
                price: leftHigh.price,
                date: leftHigh.date
            },
            cupBottom: {
                index: cupBottomIdx,
                price: cupBottom,
                date: quotes[cupBottomIdx].date
            },
            rightHigh: {
                index: rightHighIdx,
                price: rightHigh,
                date: quotes[rightHighIdx].date
            },
            cupDepth: parseFloat(cupDepth.toFixed(2)),
            baseDays
        };
    }

    return null;
}

/**
 * ハンドルパターンを検出
 * 
 * @param {Array} quotes - 日足データ
 * @param {Object} cupData - カップデータ
 * @param {Object} params - パラメータ
 */
function detectHandle(quotes, cupData, params = {}) {
    const {
        minHandleDays = 5,       // 最低1週間
        maxHandleDays = 15,      // 最大約3週間
        minHandleDepth = 5,      // 最小深さ5%
        maxHandleDepth = 15,     // 最大深さ15%
    } = params;

    if (!cupData || !cupData.detected) {
        return null;
    }

    const rightHighIdx = cupData.rightHigh.index;
    const handleRange = quotes.slice(rightHighIdx);

    if (handleRange.length < minHandleDays || handleRange.length > maxHandleDays + 5) {
        return null;
    }

    // ハンドルの高値と安値
    const handleHigh = Math.max(...handleRange.map(q => q.high));
    const handleLow = Math.min(...handleRange.map(q => q.low));

    // ハンドルの深さ
    const handleDepth = ((handleHigh - handleLow) / handleHigh) * 100;

    if (handleDepth < minHandleDepth || handleDepth > maxHandleDepth) {
        return null;
    }

    // ハンドルはカップの上半分にあるべき
    const cupMidpoint = (cupData.leftHigh.price + cupData.cupBottom.price) / 2;
    if (handleLow < cupMidpoint) {
        return null;
    }

    // ピボットポイント = ハンドル高値 + 0.1%
    const pivotPrice = handleHigh * 1.001;
    const buyZoneMax = pivotPrice * 1.05;

    return {
        detected: true,
        handleHigh,
        handleLow,
        handleDepth: parseFloat(handleDepth.toFixed(2)),
        handleDays: handleRange.length,
        pivotPrice: Math.round(pivotPrice),
        buyZoneMax: Math.round(buyZoneMax)
    };
}

/**
 * カップ・ウィズ・ハンドルパターンを検出
 * 
 * @param {Array} quotes - 日足データ
 * @returns {Object} パターン検出結果
 */
export function detectCupWithHandle(quotes) {
    if (quotes.length < 40) {
        return {
            detected: false,
            reason: 'データ不足（最低40日必要）'
        };
    }

    // カップ検出
    const cupData = detectCup(quotes);

    if (!cupData) {
        return {
            detected: false,
            reason: 'カップパターンが見つかりません'
        };
    }

    // ハンドル検出
    const handleData = detectHandle(quotes, cupData);

    if (!handleData) {
        return {
            detected: false,
            reason: 'ハンドルパターンが見つかりません',
            cupData  // カップだけ見つかった場合も情報を返す
        };
    }

    const currentPrice = quotes[quotes.length - 1].close;
    const pivotPrice = handleData.pivotPrice;
    const buyZoneMax = handleData.buyZoneMax;

    // 現在の状態を判定
    let signal, signalMessage;

    if (currentPrice >= pivotPrice && currentPrice <= buyZoneMax) {
        signal = 'BREAKOUT';
        signalMessage = '🔴 ブレイクアウト! 買いゾーン内';
    } else if (currentPrice >= pivotPrice) {
        signal = 'EXTENDED';
        signalMessage = '⚫ 買いゾーン超過（様子見）';
    } else if (currentPrice >= pivotPrice * 0.98) {
        signal = 'APPROACHING';
        signalMessage = '🟡 ピボットまであと2%以内';
    } else {
        signal = 'FORMING';
        signalMessage = '🟢 パターン形成中';
    }

    return {
        detected: true,
        signal,
        signalMessage,
        currentPrice,
        pivotPrice,
        buyZoneMax,
        distanceToPivot: parseFloat(((pivotPrice - currentPrice) / currentPrice * 100).toFixed(2)),
        cup: {
            depth: cupData.cupDepth,
            baseDays: cupData.baseDays,
            leftHighDate: cupData.leftHigh.date,
            bottomDate: cupData.cupBottom.date
        },
        handle: {
            depth: handleData.handleDepth,
            days: handleData.handleDays
        }
    };
}

export { detectCup, detectHandle, findLocalExtremes };
