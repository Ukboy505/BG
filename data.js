// js/data.js
import { generateTradingSignal } from './signals.js';
import { getIndicatorParams, updateWithSignal, refreshTable } from './ui.js';
import { granularityToSeconds } from './validation.js';
import { updateChartWithSignal } from './chart.js';

export let globalCandles = null;
export let candlesData = [];
export let tradeSize = null;
export let initialState = {
       symbol: null,
       granularity: null,
       limit: null,
       startTime: null,
       endTime: null,
       tradeSize: null,
       feePercent: null,
       indicators: {
        rsi: { enabled: true, period: 14 },
        stochastic: { enabled: true, k: 14, d: 3, smooth: 3 },
        macd: { enabled: true, fast: 12, slow: 26, signal: 9 },
        atr: { enabled: true, period: 14 },
        ema: { enabled: true, short: 12, long: 26 },
        ma: { enabled: false, period: 20 },
        bollinger: { enabled: true, period: 20, deviation: 2 },
        aroon: { enabled: true, period: 25 },
        pivot: { enabled: true, period: 14 },
        volume: { enabled: true, period: 14 },
        ichimoku: { enabled: false, tenkan: 9, kijun: 26, senkou: 52, displacement: 26 },
        fib: { enabled: false, period: 20 },
        cci: { enabled: false, period: 20 },
        obv: { enabled: false },
        chaikin_osc: { enabled: false, fast: 3, slow: 10 },
        supertrend: { enabled: false, period: 10, multiplier: 3 },
        psar: { enabled: false, step: 0.02, max: 0.2 },
        fractals: { enabled: false },
        zigzag: { enabled: false, deviation: 0.05 },
        ha: { enabled: false },
        don: { enabled: false, period: 20 },
        fibbands: { enabled: false, period: 20, multiplier: 0.3 },
        envelope: { enabled: false, period: 10, deviation: 0.005 }
    },
    candles: null,
    signalResult: null
};
export let currentCandles = [];

export async function fetchOHLCV() {
    try {
        const symbol = document.getElementById("input-symbol").value.trim();
        const granularity = document.getElementById("input-granularity").value;
        const limit = parseInt(document.getElementById("input-limit").value);
        const startTimeInput = document.getElementById("input-start-time").value;
        const endTimeInput = document.getElementById("input-end-time").value;
        const newTradeSize = parseFloat(document.getElementById("input-trade-size").value) || 1000;
        tradeSize = newTradeSize;
        const feePercent = parseFloat(document.getElementById("input-fee").value) || 0;

        if (!symbol) throw new Error("Symbol is required");
        if (!granularity) throw new Error("Granularity is required");
        if (isNaN(limit) || limit < 1 || limit > 1000) {
            throw new Error("Limit must be between 1 and 1000");
        }
        if (isNaN(tradeSize) || tradeSize <= 0) {
            throw new Error("Trade size must be positive");
        }

        let startTime, endTime;
        if (startTimeInput && endTimeInput) {
            startTime = new Date(startTimeInput).getTime();
            endTime = new Date(endTimeInput).getTime();
            if (isNaN(startTime) || isNaN(endTime)) {
                throw new Error("Invalid time input");
            }
            if (startTime >= endTime) {
                throw new Error("Start time must be before end time");
            }
        } else {
            endTime = new Date().getTime();
            const granularitySeconds = granularityToSeconds(granularity);
            startTime = endTime - (granularitySeconds * limit * 1000);
        }

        const url = `https://api.bitget.com/api/v2/spot/market/candles?symbol=${symbol}&granularity=${granularity}&startTime=${startTime}&endTime=${endTime}&limit=${limit}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch market data');
        const data = await response.json();
        if (!data.data || !Array.isArray(data.data)) throw new Error('Invalid API response');

        globalCandles = data.data.map(c => [
            Number(c[0]),
            Number(c[1]),
            Number(c[2]),
            Number(c[3]),
            Number(c[4]),
            Number(c[5]),
            Number(c[6]),
            Number(c[7])
        ]);
        console.log('Fetched candles:', globalCandles.length);
        
        document.getElementById('recalculate').disabled = !globalCandles || globalCandles.length === 0;

        currentCandles = globalCandles;
        refreshTable();

        initialState = {
            symbol,
            granularity,
            limit,
            startTime,
            endTime,
            tradeSize,
            feePercent,
            indicators: getIndicatorParams(),
            candles: globalCandles,
            signalResult: null
        };

        const signalResult = generateTradingSignal(globalCandles);
        initialState.signalResult = signalResult;
        updateWithSignal(signalResult);

        // Update chart with new data
        updateChartWithSignal(signalResult, globalCandles);
    } catch (error) {
        document.getElementById('success').className = 'error';
        document.getElementById('success').textContent = `Error: ${error.message}`;
        console.error('Fetch OHLCV error:', error);
    }
}
