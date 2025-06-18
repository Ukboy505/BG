// js/ui.js
import { generateTradingSignal } from './signals.js';
import { updateChartWithSignal } from './chart.js';
import { initialState, currentCandles } from './data.js';
import { currentTimezone, formatUnixTimestamp } from './utils.js';

export function updateWithSignal(signalResult, isCached = false, isRestored = false) {
    const baseToken = initialState.symbol.slice(0, -4);
    const priceLevels = signalResult.priceLevels;

    // Update signal display
    const signalElement = document.getElementById("signal");
    signalElement.className = signalResult.signal.toLowerCase().replace(/ /g, '-');
    signalElement.textContent = `Trading Signal: ${signalResult.signal} (Score: ${signalResult.compositeScore.toFixed(2)})`;

    // Update component scores
    const scoreList = document.getElementById("score-list");
    scoreList.innerHTML = '';
    signalResult.componentScores.forEach(comp => {
        if (comp.signal !== 0 || parseFloat(comp.score) !== 0) {
            const li = document.createElement("li");
            li.textContent = `${comp.name}: ${comp.score} (${comp.display})`;
            scoreList.appendChild(li);
        }
    });

    // Update price range list
    const priceRangeList = document.getElementById("price-range-list");
    priceRangeList.innerHTML = '';
    const feePercent = parseFloat(document.getElementById('input-fee').value) || 0;
    let priceItems = [
        `Entry Price: ${priceLevels.entryPrice}`,
        `Support: ${priceLevels.supportPrice}`,
        `Resistance: ${priceLevels.resistancePrice}`,
        `Stop-Loss: ${priceLevels.stopLoss}`,
        `Take-Profit: ${priceLevels.takeProfit}`,
        `Risk-Reward Ratio: ${priceLevels.riskRewardRatio}`
    ];

    if (signalResult.signal.includes('Buy') && priceLevels.profitLoss) {
        priceItems.push(
            `Potential Profit: $${priceLevels.profitLoss.profit} (${priceLevels.profitLoss.profitPercent}% after ${feePercent}% fees)`,
            `Potential Loss: $${priceLevels.profitLoss.loss} (${priceLevels.profitLoss.lossPercent}% after ${feePercent}% fees)`,
            `Tokens Bought: ${(tradeSize / parseFloat(priceLevels.entryPrice)).toFixed(8)} ${baseToken}`
        );
    } else if (signalResult.signal.includes('Sell') && priceLevels.profitLoss) {
        priceItems.push(
            `Potential Loss if Held: $${priceLevels.profitLoss.loss} (${priceLevels.profitLoss.lossPercent}% after ${feePercent}% fees)`,
            `Potential Re-Entry Price: ${priceLevels.potentialEntryPrice}`,
            `Tokens Held: ${(tradeSize / parseFloat(priceLevels.entryPrice)).toFixed(8)} ${baseToken}`
        );
    }

    priceItems.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        priceRangeList.appendChild(li);
    });

    // Update success message
    const success = document.getElementById("success");
    success.className = 'success';
    success.textContent = isRestored ? 
        `Restored initial analysis for ${initialState.symbol}` 
        : isCached ? 
            `Recalculated signal using stored data for ${initialState.symbol}` 
            : `Successfully fetched ${globalCandles.length} candles`;

    // Update details list
    const detailsList = document.getElementById("details-list") || document.createElement("ul");
    detailsList.id = "details-list";
    detailsList.innerHTML = '';
    const detailsItems = [
        `Trend Strength (Aroon Osc): ${signalResult.details.trendStrength}`,
        `Weights: Candlestick=${signalResult.details.weights.candle}, Chart=${signalResult.details.weights.chart}, Indicators=${signalResult.details.weights.indicators}`,
        `Raw Scores: Candlestick=${signalResult.details.rawScores.candle}, Chart=${signalResult.details.rawScores.chart}, Indicators=${signalResult.details.rawScores.indicators}`
    ];
    detailsItems.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        detailsList.appendChild(li);
    });
    if (!document.getElementById("details-list")) {
        document.getElementById("score-container").appendChild(detailsList);
    }

    // Show score container and enable buttons
    document.getElementById("score-container").style.display = 'block';
    document.getElementById("recalculate").disabled = false;
    document.getElementById("restore").disabled = false;

    // Update chart with candles and price levels
    updateChartWithSignal(signalResult, globalCandles);
}

export function restoreInitialAnalysis() {
    if (!initialState.candles) {
        document.getElementById('success').className = 'error';
        document.getElementById('success').textContent = 'No initial analysis available';
        return;
    }

    // Restore main inputs
    document.getElementById("input-symbol").value = initialState.symbol;
    document.getElementById("input-granularity").value = initialState.granularity;
    document.getElementById("input-limit").value = initialState.limit;
    document.getElementById("input-fee").value = initialState.feePercent;
    document.getElementById("input-trade-size").value = initialState.tradeSize;
    document.getElementById("input-start-time").value = initialState.startTime ? new Date(parseInt(initialState.startTime)).toISOString().slice(0, 16) : '';
    document.getElementById("input-end-time").value = initialState.endTime ? new Date(parseInt(initialState.endTime)).toISOString().slice(0, 16) : '';

    // Restore indicator parameters
    const indicators = initialState.indicators;
    document.getElementById("rsi-enabled").checked = indicators.rsi.enabled;
    document.getElementById("rsi-period").value = indicators.rsi.period;
    document.getElementById("stochastic-enabled").checked = indicators.stochastic.enabled;
    document.getElementById("stochastic-k").value = indicators.stochastic.k;
    document.getElementById("stochastic-d").value = indicators.stochastic.d;
    document.getElementById("stochastic-smooth").value = indicators.stochastic.smooth;
    document.getElementById("macd-enabled").checked = indicators.macd.enabled;
    document.getElementById("macd-fast").value = indicators.macd.fast;
    document.getElementById("macd-slow").value = indicators.macd.slow;
    document.getElementById("macd-signal").value = indicators.macd.signal;
    document.getElementById("atr-enabled").checked = indicators.atr.enabled;
    document.getElementById("atr-period").value = indicators.atr.period;
    document.getElementById("ema-enabled").checked = indicators.ema.enabled;
    document.getElementById("ema-short").value = indicators.ema.short;
    document.getElementById("ema-long").value = indicators.ema.long;
    document.getElementById("ma-enabled").checked = indicators.ma.enabled;
    document.getElementById("ma-period").value = indicators.ma.period;
    document.getElementById("bollinger-enabled").checked = indicators.bollinger.enabled;
    document.getElementById("bollinger-period").value = indicators.bollinger.period;
    document.getElementById("bollinger-deviation").value = indicators.bollinger.deviation;
    document.getElementById("aroon-enabled").checked = indicators.aroon.enabled;
    document.getElementById("aroon-period").value = indicators.aroon.period;
    document.getElementById("pivot-enabled").checked = indicators.pivot.enabled;
    document.getElementById("pivot-period").value = indicators.pivot.period;
    document.getElementById("volume-enabled").checked = indicators.volume.enabled;
    document.getElementById("volume-period").value = indicators.volume.period;
    document.getElementById("ichimoku-enabled").checked = indicators.ichimoku.enabled;
    document.getElementById("ichimoku-tenkan").value = indicators.ichimoku.tenkan;
    document.getElementById("ichimoku-kijun").value = indicators.ichimoku.kijun;
    document.getElementById("ichimoku-senkou").value = indicators.ichimoku.senkou;
    document.getElementById("ichimoku-displacement").value = indicators.ichimoku.displacement;
    document.getElementById("fib-enabled").checked = indicators.fib.enabled;
    document.getElementById("fib-period").value = indicators.fib.period;
    document.getElementById("cci-enabled").checked = indicators.cci.enabled;
    document.getElementById("cci-period").value = indicators.cci.period;
    document.getElementById("obv-enabled").checked = indicators.obv.enabled;
    document.getElementById("chaikin-osc-enabled").checked = indicators.chaikin_osc.enabled;
    document.getElementById("chaikin-osc-fast").value = indicators.chaikin_osc.fast;
    document.getElementById("chaikin-osc-slow").value = indicators.chaikin_osc.slow;
    document.getElementById("supertrend-enabled").checked = indicators.supertrend.enabled;
    document.getElementById("supertrend-period").value = indicators.supertrend.period;
    document.getElementById("supertrend-multiplier").value = indicators.supertrend.multiplier;
    document.getElementById("psar-enabled").checked = indicators.psar.enabled;
    document.getElementById("psar-step").value = indicators.psar.step;
    document.getElementById("psar-max").value = indicators.psar.max;
    document.getElementById("fractals-enabled").checked = indicators.fractals.enabled;
    document.getElementById("zigzag-enabled").checked = indicators.zigzag.enabled;
    document.getElementById("zigzag-deviation").value = indicators.zigzag.deviation;
    document.getElementById("ha-enabled").checked = indicators.ha.enabled;
    document.getElementById("don-enabled").checked = indicators.don.enabled;
    document.getElementById("don-period").value = indicators.don.period;
    document.getElementById("fibbands-enabled").checked = indicators.fibbands.enabled;
    document.getElementById("fibbands-period").value = indicators.fibbands.period;
    document.getElementById("fibbands-multiplier").value = indicators.fibbands.multiplier;
    document.getElementById("envelope-enabled").checked = indicators.envelope.enabled;
    document.getElementById("envelope-period").value = indicators.envelope.period;
    document.getElementById("envelope-deviation").value = indicators.envelope.deviation;

    // Restore price level parameters
    if (initialState.priceLevelParams) {
        document.getElementById("support-resistance-lookback").value = initialState.priceLevelParams.supportResistanceLookback;
        document.getElementById("stop-loss-buy").value = initialState.priceLevelParams.stopLossBuy;
        document.getElementById("stop-loss-sell").value = initialState.priceLevelParams.stopLossSell;
        document.getElementById("buy-very-weak-below-support").value = initialState.priceLevelParams.buyVeryWeakBelowSupport;
        document.getElementById("buy-moderate-above-support").value = initialState.priceLevelParams.buyModerateAboveSupport;
        document.getElementById("buy-strong-above-current").value = initialState.priceLevelParams.buyStrongAboveCurrent;
        document.getElementById("sell-strong-below-current").value = initialState.priceLevelParams.sellStrongBelowCurrent;
        document.getElementById("sell-moderate-above-current").value = initialState.priceLevelParams.sellModerateAboveCurrent;
        document.getElementById("sell-very-weak-above-resistance").value = initialState.priceLevelParams.sellVeryWeakAboveResistance;
        document.getElementById("sell-very-weak-new-entry-below-current").value = initialState.priceLevelParams.sellVeryWeakNewEntryBelowCurrent;
    }

    // Restore component weights
    if (initialState.componentWeights) {
        document.getElementById("candle-weight").value = initialState.componentWeights.candleWeight;
        document.getElementById("chart-weight").value = initialState.componentWeights.chartWeight;
        document.getElementById("indicator-weight").value = initialState.componentWeights.indicatorWeight;
    }

    // Restore candles and recalculate signal
    globalCandles = initialState.candles;
    
    document.getElementById('recalculate').disabled = !globalCandles || globalCandles.length === 0;
    
    currentCandles = globalCandles;
    refreshTable();

    const signalResult = generateTradingSignal(globalCandles);
    initialState.signalResult = signalResult;
    updateWithSignal(signalResult, false, true);
    updateChartWithSignal(signalResult, globalCandles);

    document.getElementById('success').className = 'success';
    document.getElementById('success').textContent = `Restored initial analysis for ${initialState.symbol}`;
}

export function resetInputs() {
    document.getElementById('candle-weight').value = 20;
    document.getElementById('chart-weight').value = 35;
    document.getElementById('indicator-weight').value = 45;
    document.getElementById('support-resistance-lookback').value = 20;
    document.getElementById('stop-loss-buy').value = 1;
    document.getElementById('stop-loss-sell').value = 0.5;
    document.getElementById('buy-very-weak-below-support').value = 1;
    document.getElementById('buy-moderate-above-support').value = 0.5;
    document.getElementById('buy-strong-above-current').value = 1;
    document.getElementById('sell-strong-below-current').value = 1;
    document.getElementById('sell-moderate-above-current').value = 0.5;
    document.getElementById('sell-very-weak-above-resistance').value = 1;
    document.getElementById('sell-very-weak-new-entry-below-current').value = 1;
    // Reset indicator inputs as needed
    validateWeights();
    validatePercentageInputs();
    validateLookback();
}

export function refreshTable() {
            const tbody = document.getElementById("candles");
            tbody.innerHTML = '';
            currentCandles.forEach(candle => {
                const row = document.createElement("tr");
                row.innerHTML = `
    <td>${formatUnixTimestamp(candle[0])}</td>
    <td>${candle[1]}</td>
    <td>${candle[2]}</td>
    <td>${candle[3]}</td>
    <td>${candle[4]}</td>
    <td>${candle[5]}</td>
    <td>${candle[6]}</td>
    <td>${candle[7]}</td>
`;
                tbody.appendChild(row);
            });
        }

export function getIndicatorParams() {
    return {
        rsi: {
            enabled: document.getElementById('rsi-enabled')?.checked || false,
            period: Math.min(Math.max(parseInt(document.getElementById('rsi-period')?.value) || 14, 5), 50)
        },
        stochastic: {
            enabled: document.getElementById('stochastic-enabled')?.checked || false,
            k: Math.min(Math.max(parseInt(document.getElementById('stochastic-k')?.value) || 14, 5), 50),
            d: Math.min(Math.max(parseInt(document.getElementById('stochastic-d')?.value) || 3, 1), 10),
            smooth: Math.min(Math.max(parseInt(document.getElementById('stochastic-smooth')?.value) || 3, 1), 10)
        },
        macd: {
            enabled: document.getElementById('macd-enabled')?.checked || false,
            fast: Math.min(Math.max(parseInt(document.getElementById('macd-fast')?.value) || 12, 5), 50),
            slow: Math.min(Math.max(parseInt(document.getElementById('macd-slow')?.value) || 26, 10), 100),
            signal: Math.min(Math.max(parseInt(document.getElementById('macd-signal')?.value) || 9, 5), 50)
        },
        atr: {
            enabled: document.getElementById('atr-enabled')?.checked || false,
            period: Math.min(Math.max(parseInt(document.getElementById('atr-period')?.value) || 14, 5), 50)
        },
        ema: {
            enabled: document.getElementById('ema-enabled')?.checked || false,
            short: Math.min(Math.max(parseInt(document.getElementById('ema-short')?.value) || 12, 5), 50),
            long: Math.min(Math.max(parseInt(document.getElementById('ema-long')?.value) || 26, 10), 100)
        },
        ma: {
            enabled: document.getElementById('ma-enabled')?.checked || false,
            period: Math.min(Math.max(parseInt(document.getElementById('ma-period')?.value) || 20, 5), 100)
        },
        bollinger: {
            enabled: document.getElementById('bollinger-enabled')?.checked || false,
            period: Math.min(Math.max(parseInt(document.getElementById('bollinger-period')?.value) || 20, 10), 100),
            deviation: Math.min(Math.max(parseFloat(document.getElementById('bollinger-deviation')?.value) || 2, 0.5), 5)
        },
        aroon: {
            enabled: document.getElementById('aroon-enabled')?.checked || false,
            period: Math.min(Math.max(parseInt(document.getElementById('aroon-period')?.value) || 25, 5), 100)
        },
        pivot: {
            enabled: document.getElementById('pivot-enabled')?.checked || false,
            period: Math.min(Math.max(parseInt(document.getElementById('pivot-period')?.value) || 14, 5), 50)
        },
        volume: {
            enabled: document.getElementById('volume-enabled')?.checked || false,
            period: Math.min(Math.max(parseInt(document.getElementById('volume-period')?.value) || 14, 5), 50)
        },
        ichimoku: {
            enabled: document.getElementById('ichimoku-enabled')?.checked || false,
            tenkan: Math.min(Math.max(parseInt(document.getElementById('ichimoku-tenkan')?.value) || 9, 5), 50),
            kijun: Math.min(Math.max(parseInt(document.getElementById('ichimoku-kijun')?.value) || 26, 10), 100),
            senkou: Math.min(Math.max(parseInt(document.getElementById('ichimoku-senkou')?.value) || 52, 20), 200),
            displacement: Math.min(Math.max(parseInt(document.getElementById('ichimoku-displacement')?.value) || 26, 10), 100)
        },
        fib: {
            enabled: document.getElementById('fib-enabled')?.checked || false,
            period: Math.min(Math.max(parseInt(document.getElementById('fib-period')?.value) || 20, 5), 100)
        },
        cci: {
            enabled: document.getElementById('cci-enabled')?.checked || false,
            period: Math.min(Math.max(parseInt(document.getElementById('cci-period')?.value) || 20, 5), 50)
        },
        obv: {
            enabled: document.getElementById('obv-enabled')?.checked || false
        },
        chaikin_osc: {
            enabled: document.getElementById('chaikin-osc-enabled')?.checked || false,
            fast: Math.min(Math.max(parseInt(document.getElementById('chaikin-osc-fast')?.value) || 3, 1), 10),
            slow: Math.min(Math.max(parseInt(document.getElementById('chaikin-osc-slow')?.value) || 10, 5), 20)
        },
        supertrend: {
            enabled: document.getElementById('supertrend-enabled')?.checked || false,
            period: Math.min(Math.max(parseInt(document.getElementById('supertrend-period')?.value) || 10, 5), 50),
            multiplier: Math.min(Math.max(parseFloat(document.getElementById('supertrend-multiplier')?.value) || 3, 1), 10)
        },
        psar: {
            enabled: document.getElementById('psar-enabled')?.checked || false,
            step: Math.min(Math.max(parseFloat(document.getElementById('psar-step')?.value) || 0.02, 0.01), 0.1),
            max: Math.min(Math.max(parseFloat(document.getElementById('psar-max')?.value) || 0.2, 0.1), 0.5)
        },
        fractals: {
            enabled: document.getElementById('fractals-enabled')?.checked || false
        },
        zigzag: {
            enabled: document.getElementById('zigzag-enabled')?.checked || false,
            deviation: Math.min(Math.max(parseFloat(document.getElementById('zigzag-deviation')?.value) || 0.05, 0.01), 0.2)
        },
        ha: {
            enabled: document.getElementById('ha-enabled')?.checked || false
        },
        don: {
            enabled: document.getElementById('don-enabled')?.checked || false,
            period: Math.min(Math.max(parseInt(document.getElementById('don-period')?.value) || 20, 5), 100)
        },
        fibbands: {
            enabled: document.getElementById('fibbands-enabled')?.checked || false,
            period: Math.min(Math.max(parseInt(document.getElementById('fibbands-period')?.value) || 20, 5), 100),
            multiplier: Math.min(Math.max(parseFloat(document.getElementById('fibbands-multiplier')?.value) || 0.3, 0.1), 1)
        },
        envelope: {
            enabled: document.getElementById('envelope-enabled')?.checked || false,
            period: Math.min(Math.max(parseInt(document.getElementById('envelope-period')?.value) || 10, 5), 50),
            deviation: Math.min(Math.max(parseFloat(document.getElementById('envelope-deviation')?.value) || 0.005, 0.001), 0.05)
        }
    };
}
