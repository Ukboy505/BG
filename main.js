// js/main.js
import { fetchOHLCV, globalCandles, initialState } from './data.js';
import { initializeChart, updateChartWithSignal } from './chart.js';
import { generateTradingSignal } from './signals.js';
import { updateWithSignal, restoreInitialAnalysis, resetInputs, getIndicatorParams } from './ui.js';
import { validateWeights, validatePercentageInputs, validateLookback } from './validation.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeChart();
    document.getElementById('request').addEventListener('click', fetchOHLCV, { passive: true });
    document.getElementById('restore').addEventListener('click', restoreInitialAnalysis, { passive: true });
    document.getElementById('reset-inputs')?.addEventListener('click', resetInputs, { passive: true });
    document.querySelectorAll('#candle-weight, #chart-weight, #indicator-weight').forEach(input => {
        input.addEventListener('change', validateWeights, { passive: true });
    });
    document.querySelectorAll('#indicator-settings input[type="number"]:not([id$="-weight"])').forEach(input => {
        input.addEventListener('change', validatePercentageInputs, { passive: true });
    });
    document.getElementById('support-resistance-lookback').addEventListener('change', validateLookback, { passive: true });
    document.getElementById('recalculate').addEventListener('click', () => {
        if (!validateWeights() || !validatePercentageInputs() || !validateLookback()) {
            return;
        }
        if (!globalCandles || globalCandles.length === 0) {
            document.getElementById('success').className = 'error';
            document.getElementById('success').textContent = 'No cached data available';
            return;
        }
        const limit = Math.min(Math.max(parseInt(document.getElementById('input-limit').value) || 200, 1), 1000);
        const startTimeInput = document.getElementById('input-start-time').value;
        const endTimeInput = document.getElementById('input-end-time').value;
        const symbol = document.getElementById('input-symbol').value.trim();
        const granularity = document.getElementById('input-granularity').value;
        const tradeSizeInput = parseFloat(document.getElementById('input-trade-size').value) || 1000;
        const feePercent = parseFloat(document.getElementById('input-fee').value) || 0;
        if (!symbol) {
            document.getElementById('success').className = 'error';
            document.getElementById('success').textContent = 'Error: Symbol is required';
            return;
        }
        if (!granularity) {
            document.getElementById('success').className = 'error';
            document.getElementById('success').textContent = 'Error: Granularity is required';
            return;
        }
        if (isNaN(tradeSizeInput) || tradeSizeInput <= 0) {
            document.getElementById('success').className = 'error';
            document.getElementById('success').textContent = 'Error: Trade size must be positive';
            return;
        }
        if (isNaN(feePercent) || feePercent < 0) {
            document.getElementById('success').className = 'error';
            document.getElementById('success').textContent = 'Error: Fee percentage cannot be negative';
            return;
        }
        let startTime, endTime;
        if (startTimeInput && endTimeInput) {
            startTime = new Date(startTimeInput).getTime();
            endTime = new Date(endTimeInput).getTime();
            if (isNaN(startTime) || isNaN(endTime)) {
                document.getElementById('success').className = 'error';
                document.getElementById('success').textContent = 'Error: Invalid time input';
                return;
            }
            if (startTime >= endTime) {
                document.getElementById('success').className = 'error';
                document.getElementById('success').textContent = 'Error: Start time must be before end time';
                return;
            }
        }
        let candlesToUse = globalCandles;
        if (startTime && endTime) {
            candlesToUse = globalCandles.filter(candle => {
                const timestamp = Number(candle[0]);
                return timestamp >= startTime && timestamp <= endTime;
            });
        }
        candlesToUse = candlesToUse.slice(-limit);
        if (candlesToUse.length === 0) {
            document.getElementById('success').className = 'error';
            document.getElementById('success').textContent = 'Error: No candles available for the specified time range and limit';
            return;
        }
        const priceLevelParams = {
            supportResistanceLookback: parseInt(document.getElementById('support-resistance-lookback')?.value) || 20,
            stopLossBuy: parseFloat(document.getElementById('stop-loss-buy')?.value) || 1,
            stopLossSell: parseFloat(document.getElementById('stop-loss-sell')?.value) || 0.5,
            buyVeryWeakBelowSupport: parseFloat(document.getElementById('buy-very-weak-below-support')?.value) || 1,
            buyModerateAboveSupport: parseFloat(document.getElementById('buy-moderate-above-support')?.value) || 0.5,
            buyStrongAboveCurrent: parseFloat(document.getElementById('buy-strong-above-current')?.value) || 1,
            sellStrongBelowCurrent: parseFloat(document.getElementById('sell-strong-below-current')?.value) || 1,
            sellModerateAboveCurrent: parseFloat(document.getElementById('sell-moderate-above-current')?.value) || 0.5,
            sellVeryWeakAboveResistance: parseFloat(document.getElementById('sell-very-weak-above-resistance')?.value) || 1,
            sellVeryWeakNewEntryBelowCurrent: parseFloat(document.getElementById('sell-very-weak-new-entry-below-current')?.value) || 1,
        };
        const componentWeights = {
            candleWeight: parseFloat(document.getElementById('candle-weight')?.value) || 20,
            chartWeight: parseFloat(document.getElementById('chart-weight')?.value) || 35,
            indicatorWeight: parseFloat(document.getElementById('indicator-weight')?.value) || 45,
        };
        initialState.symbol = symbol;
        initialState.granularity = granularity;
        initialState.limit = limit;
        initialState.startTime = startTime || initialState.startTime;
        initialState.endTime = endTime || initialState.endTime;
        initialState.tradeSize = tradeSizeInput;
        initialState.feePercent = feePercent;
        initialState.indicators = getIndicatorParams();
        initialState.priceLevelParams = priceLevelParams;
        initialState.componentWeights = componentWeights;
        initialState.candles = globalCandles;
        const signalResult = generateTradingSignal(candlesToUse);
        initialState.signalResult = signalResult;
        updateWithSignal(signalResult, true);
        updateChartWithSignal(signalResult, candlesToUse);
        document.getElementById('success').className = 'success';
        document.getElementById('success').textContent = `Recalculated signal using stored data for ${symbol}`;
    }, { passive: true });
});