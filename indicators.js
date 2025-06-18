// js/indicators.js
import { getIndicatorParams } from './ui.js';

export function calculateIndicators(candles) {
    const params = getIndicatorParams();
    const closes = candles.map(c => Number(c[4]));
    const ohlcv = candles.map(c => [Number(c[1]), Number(c[2]), Number(c[3]), Number(c[4]), Number(c[5])]);
    const volumes = candles.map(c => Number(c[5]));
    const indicators = [];

    // Validate minimum data length
    const minPeriod = Math.max(
        params.rsi.enabled ? params.rsi.period : 0,
        params.stochastic.enabled ? params.stochastic.k : 0,
        params.macd.enabled ? params.macd.slow : 0,
        params.atr.enabled ? params.atr.period : 0,
        params.ema.enabled ? params.ema.long : 0,
        params.ma.enabled ? params.ma.period : 0,
        params.bollinger.enabled ? params.bollinger.period : 0,
        params.aroon.enabled ? params.aroon.period : 0,
        params.pivot.enabled ? params.pivot.period : 0,
        params.volume.enabled ? params.volume.period : 0,
        params.ichimoku.enabled ? params.ichimoku.senkou : 0,
        params.fib.enabled ? params.fib.period : 0,
        params.cci.enabled ? params.cci.period : 0,
        params.supertrend.enabled ? params.supertrend.period : 0,
        params.don.enabled ? params.don.period : 0,
        params.fibbands.enabled ? params.fibbands.period : 0,
        params.envelope.enabled ? params.envelope.period : 0
    );
    if (ohlcv.length <= minPeriod) {
        console.error(`Insufficient data for indicators (need ${minPeriod + 1}, got ${ohlcv.length})`);
        document.getElementById('success').className = 'error';
        document.getElementById('success').textContent = `Error: Insufficient data for indicators (need ${minPeriod + 1} candles)`;
        return indicators;
    }

    try {
        if (params.rsi.enabled) {
            const rsiValues = rsi(closes, params.rsi.period);
            const rsiLatest = rsiValues[rsiValues.length - 1];
            indicators.push({
                name: 'RSI',
                signal: rsiLatest > 70 ? -1 : rsiLatest < 30 ? 1 : rsiLatest > 50 ? 0.5 : -0.5,
                strength: rsiLatest > 70 || rsiLatest < 30 ? 0.9 : 0.6,
                display: `RSI: ${rsiLatest.toFixed(2)} (${rsiLatest > 70 ? 'Overbought' : rsiLatest < 30 ? 'Oversold' : rsiLatest > 50 ? 'Bullish' : 'Bearish'})`
            });
        }

        if (params.stochastic.enabled) {
            const stochValues = stoch(ohlcv, params.stochastic.k, params.stochastic.d, params.stochastic.smooth);
            const stochLatest = stochValues[stochValues.length - 1][0];
            indicators.push({
                name: 'Stochastic',
                signal: stochLatest > 80 ? -1 : stochLatest < 20 ? 1 : stochLatest > 50 ? 0.5 : -0.5,
                strength: stochLatest > 80 || stochLatest < 20 ? 0.9 : 0.6,
                display: `Stochastic: ${stochLatest.toFixed(2)} (${stochLatest > 80 ? 'Overbought' : stochLatest < 20 ? 'Oversold' : stochLatest > 50 ? 'Bullish' : 'Bearish'})`
            });
        }

        if (params.macd.enabled) {
            const macdValues = macd(closes, params.macd.fast, params.macd.slow);
            const macdSignal = macd_signal(closes, params.macd.fast, params.macd.slow, params.macd.signal);
            const macdLatest = macdValues[macdValues.length - 1] - macdSignal[macdSignal.length - 1];
            indicators.push({
                name: 'MACD',
                signal: macdLatest > 0 ? 1 : macdLatest < 0 ? -1 : 0,
                strength: Math.abs(macdLatest) > 0.5 ? 0.9 : 0.6,
                display: `MACD: ${macdLatest.toFixed(2)} (${macdLatest > 0 ? 'Bullish' : macdLatest < 0 ? 'Bearish' : 'Neutral'})`
            });
        }

        if (params.atr.enabled) {
    if (ohlcv.length <= params.atr.period) {
        console.warn(`Insufficient data for ATR (need ${params.atr.period + 1}, got ${ohlcv.length})`);
        indicators.push({
            name: 'ATR',
            signal: 0,
            strength: 0,
            display: `ATR: Insufficient data`
        });
    } else {
        try {
            // Transform OHLCV for ATR: [high, low, close]
            const atrInput = ohlcv.map(c => [c[1], c[2], c[3]]);
            const atrValues = atr(atrInput, params.atr.period);
            const atrLatest = atrValues[atrValues.length - 1];
            const currentPrice = ohlcv[ohlcv.length - 1][3]; // Close price
            const atrPercent = (atrLatest / currentPrice) * 100;
            const atrHistory = atrValues.slice(-10);
            const atrMean = atrHistory.reduce((sum, v) => sum + v, 0) / atrHistory.length;
            const atrStd = Math.sqrt(atrHistory.reduce((sum, v) => sum + (v - atrMean) ** 2, 0) / atrHistory.length);

            const strength = atrLatest > (atrMean + atrStd) ? 0.8 : atrLatest < (atrMean - atrStd) ? 0.4 : 0.6;

            indicators.push({
                name: 'ATR',
                signal: 0,
                strength,
                display: `ATR: ${atrLatest.toFixed(2)} (${atrPercent.toFixed(2)}% of price, ${strength === 0.8 ? 'High Volatility' : strength === 0.4 ? 'Low Volatility' : 'Normal Volatility'})`
            });
        } catch (error) {
            console.error('Error calculating ATR:', error);
            indicators.push({
                name: 'ATR',
                signal: 0,
                strength: 0,
                display: `ATR: Error in calculation`
            });
        }
    }
}

        if (params.ema.enabled) {
            const shortEma = ema(closes, params.ema.short);
            const longEma = ema(closes, params.ema.long);
            const shortLatest = shortEma[shortEma.length - 1];
            const longLatest = longEma[longEma.length - 1];
            const prevShort = shortEma[shortEma.length - 2] || shortLatest;
            const prevLong = longEma[longEma.length - 2] || longLatest;
            let signal = 0;
            if (shortLatest > longLatest && prevShort <= prevLong) signal = 1;
            else if (shortLatest < longLatest && prevShort >= prevLong) signal = -1;
            else if (shortLatest > longLatest) signal = 0.5;
            else if (shortLatest < longLatest) signal = -0.5;
            indicators.push({
                name: 'EMA',
                signal,
                strength: signal === 1 || signal === -1 ? 0.9 : 0.6,
                display: `EMA: ${shortLatest.toFixed(2)}/${longLatest.toFixed(2)} (${signal === 1 ? 'Bullish Crossover' : signal === -1 ? 'Bearish Crossover' : signal > 0 ? 'Bullish' : 'Bearish'})`
            });
        }
        
                // New MA Indicator
        if (params.ma.enabled) {
            const maValues = sma(closes, params.ma.period);
            const maLatest = maValues[maValues.length - 1];
            const maPrev = maValues[maValues.length - 2] || maLatest;
            const currentClose = closes[closes.length - 1];
            const prevClose = closes[closes.length - 2] || currentClose;
            let signal = 0;
            if (currentClose > maLatest && prevClose <= maPrev) signal = 1; // Bullish crossover
            else if (currentClose < maLatest && prevClose >= maPrev) signal = -1; // Bearish crossover
            else if (currentClose > maLatest) signal = 0.5; // Above MA
            else if (currentClose < maLatest) signal = -0.5; // Below MA
            indicators.push({
                name: 'MA',
                signal,
                strength: signal === 1 || signal === -1 ? 0.9 : 0.6,
                display: `MA: ${maLatest.toFixed(2)} (${signal === 1 ? 'Bullish Crossover' : signal === -1 ? 'Bearish Crossover' : signal > 0 ? 'Above MA (Bullish)' : 'Below MA (Bearish)'})`
            });
        }

        if (params.bollinger.enabled) {
            const bandsValues = bands(closes, params.bollinger.period, params.bollinger.deviation);
            const bandsLatest = bandsValues[bandsValues.length - 1];
            indicators.push({
                name: 'Bollinger Bands',
                signal: closes[closes.length - 1] > bandsLatest[0] ? -1 : closes[closes.length - 1] < bandsLatest[2] ? 1 : 0,
                strength: closes[closes.length - 1] > bandsLatest[0] || closes[closes.length - 1] < bandsLatest[2] ? 0.9 : 0,
                display: `Bollinger Bands: ${closes[closes.length - 1].toFixed(2)} (${closes[closes.length - 1] > bandsLatest[0] ? 'Above Upper' : closes[closes.length - 1] < bandsLatest[2] ? 'Below Lower' : 'Within Bands'})`
            });
        }

        if (params.aroon.enabled) {
    if (ohlcv.length <= params.aroon.period) {
        console.warn(`Insufficient data for Aroon (need ${params.aroon.period + 1}, got ${ohlcv.length})`);
        indicators.push({
            name: 'Aroon',
            signal: 0,
            strength: 0,
            display: `Aroon: Insufficient data`
        });
    } else {
        try {
            // Extract closing prices for Aroon
            const closes = ohlcv.map(c => c[3]);
            const aroonUp = aroon_up(closes, params.aroon.period);
            const aroonDown = aroon_down(closes, params.aroon.period);
            const aroonOsc = aroon_osc(closes, params.aroon.period);

            // Get the latest values
            const aroonUpLatest = aroonUp[aroonUp.length - 1];
            const aroonDownLatest = aroonDown[aroonDown.length - 1];
            const aroonOscLatest = aroonOsc[aroonOsc.length - 1];

            let signal = 0, strength = 0.6;
            if (aroonUpLatest > aroonDownLatest && aroonUpLatest >= 70 && aroonOscLatest > 0) {
                signal = 1;
                strength = aroonOscLatest > 50 ? 0.9 : 0.7;
            } else if (aroonDownLatest > aroonUpLatest && aroonDownLatest >= 70 && aroonOscLatest < 0) {
                signal = -1;
                strength = aroonOscLatest < -50 ? 0.9 : 0.7;
            } else if (aroonUpLatest > aroonDownLatest) {
                signal = 0.5;
            } else if (aroonDownLatest > aroonUpLatest) {
                signal = -0.5;
            }

            indicators.push({
                name: 'Aroon',
                signal,
                strength,
                display: `Aroon: Up=${aroonUpLatest.toFixed(2)}, Down=${aroonDownLatest.toFixed(2)}, Osc=${aroonOscLatest.toFixed(2)} (${signal > 0 ? 'Bullish' : signal < 0 ? 'Bearish' : 'Neutral'})`
            });
        } catch (error) {
            console.error('Error calculating Aroon:', error);
            indicators.push({
                name: 'Aroon',
                signal: 0,
                strength: 0,
                display: `Aroon: Error in calculation`
            });
        }
    }
}

        if (params.pivot.enabled) {
            const periodData = candles.slice(-params.pivot.period);
            const highPeriod = periodData.map(c => Number(c[2])).reduce((max, c) => Math.max(max, c), -Infinity);
            const lowPeriod = periodData.map(c => Number(c[3])).reduce((min, c) => Math.min(min, c), Infinity);
            const lastClose = Number(periodData[periodData.length - 1][4]);
            const pp = (highPeriod + lowPeriod + lastClose) / 3;
            const r1 = (2 * pp) - lowPeriod;
            const s1 = (2 * pp) - highPeriod;
            const currentPrice = closes[closes.length - 1];
            let signal = 0, strength = 0;
            if (Math.abs(currentPrice - s1) / currentPrice < 0.015) {
                signal = 1;
                strength = 0.85;
            } else if (Math.abs(currentPrice - r1) / currentPrice < 0.015) {
                signal = -1;
                strength = 0.85;
            } else if (currentPrice > pp) {
                signal = 0.5;
                strength = 0.7;
            } else if (currentPrice < pp) {
                signal = -0.5;
                strength = 0.7;
            }
            indicators.push({
                name: 'Pivot Points',
                signal,
                strength,
                display: `Pivot Points: ${currentPrice.toFixed(2)} (${signal > 0 ? 'Near Support' : signal < 0 ? 'Near Resistance' : 'Neutral'})`
            });
        }

        if (params.volume.enabled) {
            const avgVolume = volumes.slice(-params.volume.period).reduce((sum, v) => sum + v, 0) / params.volume.period;
            const latestVolume = volumes[volumes.length - 1];
            const signal = latestVolume > avgVolume * 1.5 ? 1 : latestVolume < avgVolume * 0.5 ? -1 : 0;
            indicators.push({
                name: 'Volume',
                signal,
                strength: signal !== 0 ? 0.8 : 0.5,
                display: `Volume: ${latestVolume.toFixed(2)} (${signal > 0 ? 'High' : signal < 0 ? 'Low' : 'Average'})`
            });
        }

        if (params.ichimoku.enabled) {
            const ichimokuValues = ichimoku(ohlcv, params.ichimoku.tenkan, params.ichimoku.kijun, params.ichimoku.senkou, params.ichimoku.displacement);
            const ichimokuLatest = ichimokuValues[ichimokuValues.length - 1];
            const price = closes[closes.length - 1];
            const tenkan = ichimokuLatest[0], kijun = ichimokuLatest[1], senkouA = ichimokuLatest[2], senkouB = ichimokuLatest[3];
            let signal = 0;
            if (price > senkouA && price > senkouB && tenkan > kijun) signal = 1;
            else if (price < senkouA && price < senkouB && tenkan < kijun) signal = -1;
            indicators.push({
                name: 'Ichimoku',
                signal,
                strength: signal !== 0 ? 0.8 : 0.5,
                display: `Ichimoku: ${signal > 0 ? 'Above Cloud (Bullish)' : signal < 0 ? 'Below Cloud (Bearish)' : 'Neutral'}`
            });
        }

        if (params.fib.enabled) {
            const periodData = candles.slice(-params.fib.period);
            const high = periodData.map(c => Number(c[2])).reduce((max, c) => Math.max(max, c), -Infinity);
            const low = periodData.map(c => Number(c[3])).reduce((min, c) => Math.min(min, c), Infinity);
            const fibLevels = [low + (high - low) * 0.236, low + (high - low) * 0.382, low + (high - low) * 0.5, low + (high - low) * 0.618];
            const currentPrice = closes[closes.length - 1];
            let signal = 0, strength = 0;
            for (const fibLevel of fibLevels) {
                if (Math.abs(currentPrice - fibLevel) / currentPrice < 0.015) {
                    signal = currentPrice >= fibLevel ? 1 : -1;
                    strength = [fibLevels[1], fibLevels[3]].includes(fibLevel) ? 0.85 : 0.7;
                    break;
                }
            }
            indicators.push({
                name: 'Fibonacci Retracement',
                signal,
                strength,
                display: `Fibonacci Retracement: ${currentPrice.toFixed(2)} (${signal > 0 ? 'Near Support' : signal < 0 ? 'Near Resistance' : 'Neutral'})`
            });
        }

        // New Indicators
        if (params.cci.enabled) {
            const cciValues = cci(ohlcv, params.cci.period);
            const cciLatest = cciValues[cciValues.length - 1];
            indicators.push({
                name: 'CCI',
                signal: cciLatest > 100 ? -1 : cciLatest < -100 ? 1 : cciLatest > 0 ? 0.5 : -0.5,
                strength: Math.abs(cciLatest) > 100 ? 0.9 : 0.6,
                display: `CCI: ${cciLatest.toFixed(2)} (${cciLatest > 100 ? 'Overbought' : cciLatest < -100 ? 'Oversold' : cciLatest > 0 ? 'Bullish' : 'Bearish'})`
            });
        }

        if (params.obv.enabled) {
            const obvValues = obv(closes, volumes);
            const obvLatest = obvValues[obvValues.length - 1];
            const obvPrev = obvValues[obvValues.length - 2] || obvLatest;
            const signal = obvLatest > obvPrev ? 1 : obvLatest < obvPrev ? -1 : 0;
            indicators.push({
                name: 'OBV',
                signal,
                strength: signal !== 0 ? 0.8 : 0.5,
                display: `OBV: ${obvLatest.toFixed(2)} (${signal > 0 ? 'Rising (Bullish)' : signal < 0 ? 'Falling (Bearish)' : 'Neutral'})`
            });
        }

        if (params.chaikin_osc.enabled) {
            const chaikinValues = chaikin_osc(ohlcv, params.chaikin_osc.fast, params.chaikin_osc.slow);
            const chaikinLatest = chaikinValues[chaikinValues.length - 1];
            indicators.push({
                name: 'Chaikin Oscillator',
                signal: chaikinLatest > 0 ? 1 : chaikinLatest < 0 ? -1 : 0,
                strength: Math.abs(chaikinLatest) > 0.5 ? 0.9 : 0.6,
                display: `Chaikin Oscillator: ${chaikinLatest.toFixed(2)} (${chaikinLatest > 0 ? 'Bullish' : chaikinLatest < 0 ? 'Bearish' : 'Neutral'})`
            });
        }

        if (params.supertrend.enabled) {
            const supertrendValues = supertrend(ohlcv, params.supertrend.period, params.supertrend.multiplier);
            const supertrendLatest = supertrendValues[supertrendValues.length - 1][1]; // Trend direction
            indicators.push({
                name: 'Supertrend',
                signal: supertrendLatest === 1 ? 1 : -1,
                strength: 0.85,
                display: `Supertrend: ${supertrendLatest === 1 ? 'Bullish' : 'Bearish'}`
            });
        }

        if (params.psar.enabled) {
            const psarValues = psar(ohlcv, params.psar.step, params.psar.max);
            const psarLatest = psarValues[psarValues.length - 1];
            const signal = psarLatest < closes[closes.length - 1] ? 1 : -1;
            indicators.push({
                name: 'PSAR',
                signal,
                strength: 0.8,
                display: `PSAR: ${psarLatest.toFixed(2)} (${signal > 0 ? 'Below Price (Bullish)' : 'Above Price (Bearish)'})`
            });
        }

        if (params.fractals.enabled) {
            const fractalValues = fractals(ohlcv, true);
            const lastFractal = fractalValues[fractalValues.length - 1] || [-1, -1];
            const signal = lastFractal[1] !== -1 ? 1 : lastFractal[0] !== -1 ? -1 : 0;
            indicators.push({
                name: 'Fractals',
                signal,
                strength: signal !== 0 ? 0.85 : 0,
                display: `Fractals: ${signal > 0 ? 'Bullish Reversal' : signal < 0 ? 'Bearish Reversal' : 'No Signal'}`
            });
        }

        if (params.zigzag.enabled) {
            const zigzagValues = zigzag(ohlcv, params.zigzag.deviation);
            const latestSwing = zigzagValues[zigzagValues.length - 1];
            const prevSwing = zigzagValues[zigzagValues.length - 2] || latestSwing;
            const signal = latestSwing > prevSwing ? 1 : latestSwing < prevSwing ? -1 : 0;
            indicators.push({
                name: 'ZigZag',
                signal,
                strength: signal !== 0 ? 0.8 : 0.5,
                display: `ZigZag: ${latestSwing.toFixed(2)} (${signal > 0 ? 'Swing High (Bullish)' : signal < 0 ? 'Swing Low (Bearish)' : 'Neutral'})`
            });
        }
    } catch (error) {
        console.error('Error processing indicators:', error);
    }

    return indicators;
}

export function calculateIndicatorChartData(candles, params) {
    const chartData = {};
    const closes = candles.map(c => Number(c[4]));
    const ohlcv = candles.map(c => [Number(c[1]), Number(c[2]), Number(c[3]), Number(c[4]), Number(c[5])]);
    const volumes = candles.map(c => Number(c[5]));
    const timestamps = candles.map(c => Number(c[0]) / 1000); // Convert ms to seconds for chart

    try {
        // RSI
        if (params.rsi.enabled) {
            const rsiValues = rsi(closes, params.rsi.period);
            chartData.rsi = rsiValues.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v) ? v : null
            })).filter(d => d.value !== null);
        }

        // Stochastic
        if (params.stochastic.enabled) {
            const stochValues = stoch(ohlcv, params.stochastic.k, params.stochastic.d, params.stochastic.smooth);
            chartData.stochastic_k = stochValues.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v[0]) ? v[0] : null
            })).filter(d => d.value !== null);
            chartData.stochastic_d = stochValues.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v[1]) ? v[1] : null
            })).filter(d => d.value !== null);
        }

        // MACD
        if (params.macd.enabled) {
            const macdValues = macd(closes, params.macd.fast, params.macd.slow);
            const macdSignal = macd_signal(closes, params.macd.fast, params.macd.slow, params.macd.signal);
            chartData.macd = macdValues.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v) ? v : null
            })).filter(d => d.value !== null);
            chartData.macd_signal = macdSignal.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v) ? v : null
            })).filter(d => d.value !== null);
            chartData.macd_histogram = macdValues.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v - macdSignal[i]) ? v - macdSignal[i] : null
            })).filter(d => d.value !== null);
        }

        // ATR
        if (params.atr.enabled && ohlcv.length > params.atr.period) {
            const atrValues = atr(ohlcv.map(c => [c[1], c[2], c[3]]), params.atr.period);
            chartData.atr = atrValues.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v) ? v : null
            })).filter(d => d.value !== null);
        }

        // EMA
        if (params.ema.enabled) {
            const shortEma = ema(closes, params.ema.short);
            const longEma = ema(closes, params.ema.long);
            chartData.ema_short = shortEma.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v) ? v : null
            })).filter(d => d.value !== null);
            chartData.ema_long = longEma.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v) ? v : null
            })).filter(d => d.value !== null);
        }

        // MA
        if (params.ma.enabled) {
            const maValues = sma(closes, params.ma.period);
            chartData.ma = maValues.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v) ? v : null
            })).filter(d => d.value !== null);
        }

        // Bollinger Bands
        if (params.bollinger.enabled) {
            const bandsValues = bands(closes, params.bollinger.period, params.bollinger.deviation);
            chartData.bollinger_upper = bandsValues.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v[0]) ? v[0] : null
            })).filter(d => d.value !== null);
            chartData.bollinger_middle = bandsValues.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v[1]) ? v[1] : null
            })).filter(d => d.value !== null);
            chartData.bollinger_lower = bandsValues.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v[2]) ? v[2] : null
            })).filter(d => d.value !== null);
        }

        // Aroon
        if (params.aroon.enabled && ohlcv.length > params.aroon.period) {
            const aroonUp = aroon_up(closes, params.aroon.period);
            const aroonDown = aroon_down(closes, params.aroon.period);
            chartData.aroon_up = aroonUp.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v) ? v : null
            })).filter(d => d.value !== null);
            chartData.aroon_down = aroonDown.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v) ? v : null
            })).filter(d => d.value !== null);
        }

        // Pivot Points
        if (params.pivot.enabled) {
            const periodData = candles.slice(-params.pivot.period);
            const highPeriod = periodData.map(c => Number(c[2])).reduce((max, c) => Math.max(max, c), -Infinity);
            const lowPeriod = periodData.map(c => Number(c[3])).reduce((min, c) => Math.min(min, c), Infinity);
            const lastClose = Number(periodData[periodData.length - 1][4]);
            const pp = (highPeriod + lowPeriod + lastClose) / 3;
            const r1 = (2 * pp) - lowPeriod;
            const s1 = (2 * pp) - highPeriod;
            chartData.pivot = [{
                time: timestamps[timestamps.length - 1],
                value: pp
            }, {
                time: timestamps[timestamps.length - 1],
                value: r1
            }, {
                time: timestamps[timestamps.length - 1],
                value: s1
            }];
        }

        // Volume
        if (params.volume.enabled) {
            chartData.volume = volumes.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v) ? v : null,
                color: closes[i] >= closes[i - 1] ? '#26a69a' : '#ef5350'
            })).filter(d => d.value !== null);
        }

        // Ichimoku
        if (params.ichimoku.enabled) {
            const ichimokuValues = ichimoku(ohlcv, params.ichimoku.tenkan, params.ichimoku.kijun, params.ichimoku.senkou, params.ichimoku.displacement);
            chartData.ichimoku_tenkan = ichimokuValues.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v[0]) ? v[0] : null
            })).filter(d => d.value !== null);
            chartData.ichimoku_kijun = ichimokuValues.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v[1]) ? v[1] : null
            })).filter(d => d.value !== null);
            chartData.ichimoku_senkou_a = ichimokuValues.map((v, i) => ({
                time: timestamps[i + params.ichimoku.displacement] || timestamps[timestamps.length - 1],
                value: isFinite(v[2]) ? v[2] : null
            })).filter(d => d.value !== null);
            chartData.ichimoku_senkou_b = ichimokuValues.map((v, i) => ({
                time: timestamps[i + params.ichimoku.displacement] || timestamps[timestamps.length - 1],
                value: isFinite(v[3]) ? v[3] : null
            })).filter(d => d.value !== null);
        }

        // Fibonacci Retracement
        if (params.fib.enabled) {
            const periodData = candles.slice(-params.fib.period);
            const high = periodData.map(c => Number(c[2])).reduce((max, c) => Math.max(max, c), -Infinity);
            const low = periodData.map(c => Number(c[3])).reduce((min, c) => Math.min(min, c), Infinity);
            const fibLevels = [0.236, 0.382, 0.5, 0.618].map(level => low + (high - low) * level);
            chartData.fib = fibLevels.map(level => ({
                time: timestamps[timestamps.length - 1],
                value: level
            }));
        }

        // CCI
        if (params.cci.enabled) {
            const cciValues = cci(ohlcv, params.cci.period);
            chartData.cci = cciValues.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v) ? v : null
            })).filter(d => d.value !== null);
        }

        // OBV
        if (params.obv.enabled) {
            const obvValues = obv(closes, volumes);
            chartData.obv = obvValues.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v) ? v : null
            })).filter(d => d.value !== null);
        }

        // Chaikin Oscillator
        if (params.chaikin_osc.enabled) {
            const chaikinValues = chaikin_osc(ohlcv, params.chaikin_osc.fast, params.chaikin_osc.slow);
            chartData.chaikin_osc = chaikinValues.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v) ? v : null
            })).filter(d => d.value !== null);
        }

        // Supertrend
        if (params.supertrend.enabled) {
            const supertrendValues = supertrend(ohlcv, params.supertrend.period, params.supertrend.multiplier);
            chartData.supertrend = supertrendValues.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v[0]) ? v[0] : null
            })).filter(d => d.value !== null);
        }

        // PSAR
        if (params.psar.enabled) {
            const psarValues = psar(ohlcv, params.psar.step, params.psar.max);
            chartData.psar = psarValues.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v) ? v : null
            })).filter(d => d.value !== null);
        }

        // Fractals
        if (params.fractals.enabled) {
            const fractalValues = fractals(ohlcv, true);
            chartData.fractals = fractalValues
                .map((v, i) => ({
                    time: timestamps[i],
                    value: v[0] !== -1 ? ohlcv[i][2] : v[1] !== -1 ? ohlcv[i][3] : null
                }))
                .filter(d => d.value !== null);
        }

        // ZigZag
        if (params.zigzag.enabled) {
            const zigzagValues = zigzag(ohlcv, params.zigzag.deviation);
            chartData.zigzag = zigzagValues.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v) ? v : null
            })).filter(d => d.value !== null);
        }

        // Heikin Ashi
        if (params.ha.enabled) {
            const haCandles = ha(ohlcv);
            chartData.ha = haCandles.map((c, i) => ({
                time: timestamps[i],
                open: c[0],
                high: c[1],
                low: c[2],
                close: c[3]
            })).filter(c => isFinite(c.open) && isFinite(c.high) && isFinite(c.low) && isFinite(c.close));
        }

        // Donchian Channels
        if (params.don.enabled) {
            const donValues = don(ohlcv, params.don.period);
            chartData.don_upper = donValues.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v[0]) ? v[0] : null
            })).filter(d => d.value !== null);
            chartData.don_middle = donValues.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v[1]) ? v[1] : null
            })).filter(d => d.value !== null);
            chartData.don_lower = donValues.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v[2]) ? v[2] : null
            })).filter(d => d.value !== null);
        }

        // Fibonacci Bands
        if (params.fibbands.enabled) {
            const fibbandsValues = fibbands(ohlcv, params.fibbands.period, params.fibbands.multiplier);
            chartData.fibbands = fibbandsValues[0].map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v) ? v : null
            })).filter(d => d.value !== null);
            chartData.vwma = fibbandsValues[1].map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v) ? v : null
            })).filter(d => d.value !== null);
        }

        // Envelope
        if (params.envelope.enabled) {
            const envelopeValues = envelope(closes, params.envelope.period, params.envelope.deviation);
            chartData.envelope_upper = envelopeValues.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v[0]) ? v[0] : null
            })).filter(d => d.value !== null);
            chartData.envelope_middle = envelopeValues.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v[1]) ? v[1] : null
            })).filter(d => d.value !== null);
            chartData.envelope_lower = envelopeValues.map((v, i) => ({
                time: timestamps[i],
                value: isFinite(v[2]) ? v[2] : null
            })).filter(d => d.value !== null);
        }
    } catch (error) {
        console.error('Error calculating indicator chart data:', error);
    }

    return chartData;
}