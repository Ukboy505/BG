// js/signals.js
import { calculateIndicators } from './indicators.js';
import { getIndicatorParams } from './ui.js';

export function generateTradingSignal(candles) {
    try {
    const candlePatterns = detectCandlestickPatterns(candles);
    const chartPatterns = detectChartPatterns(candles);
    const indicators = calculateIndicators(candles);

    // Calculate trend strength using Aroon Oscillator
let trendStrength = 0;
try {
    const closes = candles.map(c => Number(c[4])); // Closing prices
    const aroonOscValues = aroon_osc(closes, 25);
    const aroonOsc = aroonOscValues[aroonOscValues.length - 1];
    trendStrength = Math.abs(aroonOsc); // Scale: 0 to 100
} catch (error) {
    console.error('Error calculating trend strength:', error);
}

    // Dynamic weights based on trend strength
    const candleWeight = trendStrength > 50 ? 0.15 : 0.2;
    const chartWeight = trendStrength > 50 ? 0.3 : 0.35;
    const indicatorWeight = trendStrength > 50 ? 0.55 : 0.45;

    const candleScore = candlePatterns.signal * candlePatterns.strength;
    const chartScore = chartPatterns.signal * chartPatterns.strength;
    const indicatorScore = indicators.length > 0 ? indicators.reduce((sum, i) => sum + i.signal * i.strength, 0) / indicators.length : 0;

    const compositeScore = (candleScore * candleWeight) + (chartScore * chartWeight) + (indicatorScore * indicatorWeight);
    let signal;

    if (compositeScore >= 0.85) signal = 'Strong Buy';
    else if (compositeScore >= 0.55) signal = 'Moderate Buy';
    else if (compositeScore >= 0.3) signal = 'Weak Buy';
    else if (compositeScore >= 0.1) signal = 'Very Weak Buy';
    else if (compositeScore <= -0.85) signal = 'Strong Sell';
    else if (compositeScore <= -0.55) signal = 'Moderate Sell';
    else if (compositeScore <= -0.3) signal = 'Weak Sell';
    else if (compositeScore <= -0.1) signal = 'Very Weak Sell';
    else signal = 'Hold';

    const componentScores = [
        {
            name: 'Candlestick Patterns',
            score: (candleScore * candleWeight).toFixed(2),
            details: candlePatterns.pattern,
            display: `${candlePatterns.pattern}: ${candlePatterns.signal.toFixed(2)} (${candlePatterns.signal > 0 ? 'Bullish' : candlePatterns.signal < 0 ? 'Bearish' : 'Neutral'})`
        },
        {
            name: 'Chart Patterns',
            score: (chartScore * chartWeight).toFixed(2),
            details: chartPatterns.pattern,
            display: `${chartPatterns.pattern}: ${chartPatterns.signal.toFixed(2)} (${chartPatterns.signal > 0 ? 'Bullish' : chartPatterns.signal < 0 ? 'Bearish' : 'Neutral'})`
        },
        ...indicators.map(ind => ({
            name: ind.name,
            score: ((ind.signal * ind.strength) * indicatorWeight / (indicators.length || 1)).toFixed(2),
            details: ind.signal > 0 ? 'Bullish' : ind.signal < 0 ? 'Bearish' : 'Neutral',
            display: ind.display
        }))
    ];

    const priceLevels = calculatePriceLevels(candles, compositeScore, signal);

    return {
        signal,
        compositeScore,
        componentScores,
        priceLevels,
        details: {
            trendStrength: trendStrength.toFixed(2),
            weights: { candle: candleWeight, chart: chartWeight, indicators: indicatorWeight },
            rawScores: { candle: candleScore.toFixed(2), chart: chartScore.toFixed(2), indicators: indicatorScore.toFixed(2) },
            candlestick: { pattern: candlePatterns.pattern, strength: candlePatterns.strength.toFixed(2) },
            chart: { pattern: chartPatterns.pattern, strength: chartPatterns.strength.toFixed(2) },
            indicators: indicators.map(i => ({
                name: i.name,
                signal: i.signal > 0 ? 'Bullish' : i.signal < 0 ? 'Bearish' : 'Neutral',
                strength: i.strength.toFixed(2)
            }))
        }
    };
  } catch (error) {
    document.getElementById('success').className = 'error';
    document.getElementById('success').textContent = `Error recalculating signal: ${error.message}`;
    console.error('Recalculate error:', error);
}
}

export function detectCandlestickPatterns(candles) {
    const params = getIndicatorParams();
    const ohlcv = candles.map(c => [Number(c[1]), Number(c[2]), Number(c[3]), Number(c[4]), Number(c[5])]); // [open, high, low, close, volume]
    // Use Heikin Ashi if enabled to reduce noise
    const haCandles = params.ha.enabled ? ha(ohlcv) : ohlcv;
    // Get fractals for reversal confirmation
    const fractalsValues = params.fractals.enabled ? fractals(ohlcv, true) : [];
    const lastFractal = fractalsValues[fractalsValues.length - 1] || [-1, -1]; // [bearish, bullish]

    // Extract candles for pattern analysis
    const lastCandle = haCandles[haCandles.length - 1];
    const prevCandle = haCandles[haCandles.length - 2] || lastCandle;
    const prev2Candle = haCandles[haCandles.length - 3] || prevCandle;
    const prev3Candle = haCandles[haCandles.length - 4] || prev2Candle;
    const prev4Candle = haCandles[haCandles.length - 5] || prev3Candle;
    const [o, h, l, c] = lastCandle; // Current: open, high, low, close
    const [po, ph, pl, pc] = prevCandle; // Previous
    const [ppo, pph, ppl, ppc] = prev2Candle; // Two candles ago
    const [pppo, ppph, pppl, pppc] = prev3Candle; // Three candles ago
    const [ppp2o, ppp2h, ppp2l, ppp2c] = prev4Candle; // Four candles ago

    const body = Math.abs(c - o);
    const range = h - l;
    const prevBody = Math.abs(pc - po);
    const prev2Body = Math.abs(ppc - ppo);
    const prev3Body = Math.abs(pppc - pppo);
    let signal = 0, strength = 0, pattern = 'None';

    try {
        // Determine trend context (last 5 candles, excluding current)
        const isUptrend = candles.slice(-6, -1).every((c, i, arr) => i > 0 ? Number(c[4]) > Number(arr[i-1][4]) : true);
        const isDowntrend = candles.slice(-6, -1).every((c, i, arr) => i > 0 ? Number(c[4]) < Number(arr[i-1][4]) : true);

        // Existing Patterns
        if (body > range * 0.95 && o === l && c === h && c > o) {
            signal = 1;
            strength = 0.95 * (lastFractal[1] !== -1 ? 1.1 : 1);
            pattern = 'Bullish Marubozu' + (lastFractal[1] !== -1 ? ' (Fractal Confirmed)' : '');
        } else if (body > range * 0.95 && o === h && c === l && c < o) {
            signal = -1;
            strength = 0.95 * (lastFractal[0] !== -1 ? 1.1 : 1);
            pattern = 'Bearish Marubozu' + (lastFractal[0] !== -1 ? ' (Fractal Confirmed)' : '');
        } else if (pc < po && c > o && o <= pl && c >= ph && body > prevBody) {
            signal = 1;
            strength = 0.95 * (lastFractal[1] !== -1 ? 1.1 : 1);
            pattern = 'Bullish Engulfing' + (lastFractal[1] !== -1 ? ' (Fractal Confirmed)' : '');
        } else if (pc > po && c < o && o >= ph && c <= pl && body > prevBody) {
            signal = -1;
            strength = 0.95 * (lastFractal[0] !== -1 ? 1.1 : 1);
            pattern = 'Bearish Engulfing' + (lastFractal[0] !== -1 ? ' (Fractal Confirmed)' : '');
        } else if (c > o && pc > po && ppc > ppo && c > pc && pc > ppc && body > range * 0.4 && prevBody > (ph - pl) * 0.4 && prev2Body > (pph - ppl) * 0.4 && isDowntrend) {
            signal = 1;
            strength = 0.9 * (lastFractal[1] !== -1 ? 1.1 : 1);
            pattern = 'Three White Soldiers' + (lastFractal[1] !== -1 ? ' (Fractal Confirmed)' : '');
        } else if (c < o && pc < po && ppc < ppo && c < pc && pc < ppc && body > range * 0.4 && prevBody > (ph - pl) * 0.4 && prev2Body > (pph - ppl) * 0.4 && isUptrend) {
            signal = -1;
            strength = 0.9 * (lastFractal[0] !== -1 ? 1.1 : 1);
            pattern = 'Three Black Crows' + (lastFractal[0] !== -1 ? ' (Fractal Confirmed)' : '');
        } else if (ppo > pppo && ppc < pppo && pc > po && pc > ppo && pc > ppp2c && c < o && c < ppc && Math.abs(c - pppc) < range * 0.1 && Math.abs(ppc - ppp2c) < range * 0.2) {
            signal = -1;
            strength = 0.9 * (lastFractal[0] !== -1 ? 1.1 : 1);
            pattern = 'Head and Shoulders' + (lastFractal[0] !== -1 ? ' (Fractal Confirmed)' : '');
        } else if (ppo < pppo && ppc > pppo && pc < po && pc < ppo && pc < ppp2c && c > o && c > ppc && Math.abs(c - pppc) < range * 0.1 && Math.abs(ppc - ppp2c) < range * 0.2) {
            signal = 1;
            strength = 0.9 * (lastFractal[1] !== -1 ? 1.1 : 1);
            pattern = 'Inverted Head and Shoulders' + (lastFractal[1] !== -1 ? ' (Fractal Confirmed)' : '');
        } else if (ppc < ppo && Math.abs(po - pc) < (ph - pl) * 0.1 && c > o && c > (ppo + ppc) / 2) {
            signal = 1;
            strength = 0.9 * (lastFractal[1] !== -1 ? 1.1 : 1);
            pattern = 'Morning Star' + (lastFractal[1] !== -1 ? ' (Fractal Confirmed)' : '');
        } else if (ppc > ppo && Math.abs(po - pc) < (ph - pl) * 0.1 && c < o && c < (ppo + ppc) / 2) {
            signal = -1;
            strength = 0.9 * (lastFractal[0] !== -1 ? 1.1 : 1);
            pattern = 'Evening Star' + (lastFractal[0] !== -1 ? ' (Fractal Confirmed)' : '');
        } else if (body < range * 0.3 && (l - Math.min(o, c)) > body * 2 && Math.max(o, c) < h * 1.1 && isDowntrend) {
            signal = 1;
            strength = 0.85 * (lastFractal[1] !== -1 ? 1.1 : 1);
            pattern = 'Hammer' + (lastFractal[1] !== -1 ? ' (Fractal Confirmed)' : '');
        } else if (body < range * 0.3 && (l - Math.min(o, c)) > body * 2 && Math.max(o, c) < h * 1.1 && isUptrend) {
            signal = -1;
            strength = 0.85 * (lastFractal[0] !== -1 ? 1.1 : 1);
            pattern = 'Hanging Man' + (lastFractal[0] !== -1 ? ' (Fractal Confirmed)' : '');
        } else if (body < range * 0.3 && (Math.max(o, c) - h) > body * 2 && Math.min(o, c) > l * 0.9 && isUptrend) {
            signal = -1;
            strength = 0.85 * (lastFractal[0] !== -1 ? 1.1 : 1);
            pattern = 'Shooting Star' + (lastFractal[0] !== -1 ? ' (Fractal Confirmed)' : '');
        } else if (body < range * 0.05 && o >= h * 0.99 && c >= h * 0.99 && (h - l) > range * 0.5 && isDowntrend) {
            signal = 1;
            strength = 0.8 * (lastFractal[1] !== -1 ? 1.1 : 1);
            pattern = 'Dragonfly Doji' + (lastFractal[1] !== -1 ? ' (Fractal Confirmed)' : '');
        } else if (body < range * 0.05 && o <= l * 1.01 && c <= l * 1.01 && (h - l) > range * 0.5 && isUptrend) {
            signal = -1;
            strength = 0.8 * (lastFractal[0] !== -1 ? 1.1 : 1);
            pattern = 'Gravestone Doji' + (lastFractal[0] !== -1 ? ' (Fractal Confirmed)' : '');
        } else if (pc < po && c > o && o > pc && c < po && body < prevBody * 0.6 && isDowntrend) {
            signal = 1;
            strength = 0.85 * (lastFractal[1] !== -1 ? 1.1 : 1);
            pattern = 'Bullish Harami' + (lastFractal[1] !== -1 ? ' (Fractal Confirmed)' : '');
        } else if (pc > po && c < o && o < pc && c > po && body < prevBody * 0.6 && isUptrend) {
            signal = -1;
            strength = 0.85 * (lastFractal[0] !== -1 ? 1.1 : 1);
            pattern = 'Bearish Harami' + (lastFractal[0] !== -1 ? ' (Fractal Confirmed)' : '');
        } else if (body < range * 0.3 && Math.abs(h - Math.max(o, c)) > body && Math.abs(Math.min(o, c) - l) > body) {
            signal = isUptrend ? -0.5 : 0.5;
            strength = 0.7;
            pattern = 'Spinning Top';
        } else if (body < range * 0.1) {
            signal = pc > po ? -0.5 : 0.5;
            strength = 0.7;
            pattern = 'Doji';
        }
        // New Patterns
        else if (Math.abs(h - ph) / h < 0.001 && isUptrend && c < o && pc > po) {
            signal = -1;
            strength = 0.85 * (lastFractal[0] !== -1 ? 1.1 : 1);
            pattern = 'Tweezer Top' + (lastFractal[0] !== -1 ? ' (Fractal Confirmed)' : '');
        } else if (Math.abs(l - pl) / l < 0.001 && isDowntrend && c > o && pc < po) {
            signal = 1;
            strength = 0.85 * (lastFractal[1] !== -1 ? 1.1 : 1);
            pattern = 'Tweezer Bottom' + (lastFractal[1] !== -1 ? ' (Fractal Confirmed)' : '');
        } else if (h < ph && l > pl && body < prevBody) {
            signal = c > o ? 0.5 : -0.5;
            strength = 0.8;
            pattern = 'Inside Bar';
        } else if (h > ph && l < pl && body > prevBody) {
            signal = c > o ? 1 : -1;
            strength = 0.85;
            pattern = 'Outside Bar';
        } else if (isDowntrend && ppc < ppo && pc > po && pc < ppo && po > ppc && c > o && c > ppo) {
            signal = 1;
            strength = 0.9 * (lastFractal[1] !== -1 ? 1.1 : 1);
            pattern = 'Three Inside Up' + (lastFractal[1] !== -1 ? ' (Fractal Confirmed)' : '');
        } else if (isUptrend && ppc > ppo && pc < po && pc > ppo && po < ppc && c < o && c < ppo) {
            signal = -1;
            strength = 0.9 * (lastFractal[0] !== -1 ? 1.1 : 1);
            pattern = 'Three Inside Down' + (lastFractal[0] !== -1 ? ' (Fractal Confirmed)' : '');
        } else if (isDowntrend && pc < po && o > pc && c > o && body > prevBody) {
            signal = 1;
            strength = 0.95 * (lastFractal[1] !== -1 ? 1.1 : 1);
            pattern = 'Bullish Kicker' + (lastFractal[1] !== -1 ? ' (Fractal Confirmed)' : '');
        } else if (isUptrend && pc > po && o < pc && c < o && body > prevBody) {
            signal = -1;
            strength = 0.95 * (lastFractal[0] !== -1 ? 1.1 : 1);
            pattern = 'Bearish Kicker' + (lastFractal[0] !== -1 ? ' (Fractal Confirmed)' : '');
        }
    } catch (error) {
        console.error('Error in candlestick pattern detection:', error);
    }

    return { signal, strength, pattern };
}

export function detectChartPatterns(candles) {
    const params = getIndicatorParams();
    const closes = candles.map(c => Number(c[4]));
    const highs = candles.map(c => Number(c[2]));
    const lows = candles.map(c => Number(c[3]));
    const volumes = candles.map(c => Number(c[5]));
    const ohlcv = candles.map(c => [Number(c[1]), Number(c[2]), Number(c[3]), Number(c[4]), Number(c[5])]);
    const currentPrice = closes[closes.length - 1];
    const avgVolume = volumes.slice(-10).reduce((sum, v) => sum + v, 0) / 10;
    let patterns = [];

    try {
        // Existing Patterns
        const supportLevel = support(closes);
        const resistanceLevel = resistance(closes);

        if (Math.abs(currentPrice - supportLevel.calculate(closes.length - 1)) / currentPrice < 0.015) {
            patterns.push({ signal: 1, strength: 0.9, pattern: 'Support' });
        } else if (Math.abs(currentPrice - resistanceLevel.calculate(closes.length - 1)) / currentPrice < 0.015) {
            patterns.push({ signal: -1, strength: 0.9, pattern: 'Resistance' });
        } else if (Math.abs(currentPrice - supportLevel.calculate(closes.length - 1)) / currentPrice < 0.03) {
            patterns.push({ signal: 1, strength: 0.75, pattern: 'Support Zone' });
        }
        if (lows.slice(-15).filter(l => Math.abs(l - currentPrice) / l < 0.02).length >= 3 &&
            currentPrice <= supportLevel.calculate(closes.length - 1)) {
            const strength = volumes[volumes.length - 1] > avgVolume * 1.5 ? 0.9 : 0.8;
            patterns.push({ signal: 1, strength, pattern: 'Demand Zone' });
        }
        if (highs.slice(-15).filter(h => Math.abs(h - currentPrice) / h < 0.02).length >= 3 &&
            currentPrice >= resistanceLevel.calculate(closes.length - 1)) {
            const strength = volumes[volumes.length - 1] > avgVolume * 1.5 ? 0.9 : 0.8;
            patterns.push({ signal: -1, strength, pattern: 'Supply Zone' });
        }
        if (highs.slice(-15).reduce((acc, h, i) => acc && (i > 2 ? Math.abs(h - highs[i-2]) < 0.01 * h : true), true) &&
            lows.slice(-15).reduce((acc, l, i) => acc && (i > 0 && l > lows[i-1]), true) &&
            currentPrice > resistanceLevel.calculate(closes.length - 1)) {
            patterns.push({ signal: 1, strength: 0.85, pattern: 'Ascending Triangle' });
        }
        if (lows.slice(-15).reduce((acc, l, i) => acc && (i > 2 ? Math.abs(l - lows[i-2]) < 0.01 * l : true), true) &&
            highs.slice(-15).reduce((acc, h, i) => acc && (i > 0 && h < highs[i-1]), true) &&
            currentPrice < supportLevel.calculate(closes.length - 1)) {
            patterns.push({ signal: -1, strength: 0.85, pattern: 'Descending Triangle' });
        }

        // New Patterns from ta.js
        if (params.don.enabled) {
            const donValues = don(ohlcv, params.don.period)[0]; // [upper, middle, lower]
            patterns.push({
                signal: currentPrice > donValues[0] ? 1 : currentPrice < donValues[2] ? -1 : 0,
                strength: 0.8,
                pattern: currentPrice > donValues[0] ? 'Donchian Breakout (Bullish)' : 
                         currentPrice < donValues[2] ? 'Donchian Breakout (Bearish)' : 'Donchian Channel'
            });
        }
        if (params.fibbands.enabled) {
            const fibbandsValues = fibbands(ohlcv, params.fibbands.period, params.fibbands.multiplier)[0]; // [fib levels..., vwma]
            patterns.push({
                signal: currentPrice > fibbandsValues[6] ? 1 : currentPrice < fibbandsValues[6] ? -1 : 0,
                strength: 0.8,
                pattern: 'Fibonacci Bands'
            });
        }
        if (params.envelope.enabled) {
            const envelopeValues = envelope(closes, params.envelope.period, params.envelope.deviation)[0]; // [upper, middle, lower]
            patterns.push({
                signal: currentPrice > envelopeValues[0] ? -1 : currentPrice < envelopeValues[2] ? 1 : 0,
                strength: 0.75,
                pattern: 'Envelope'
            });
        }

        // Enhanced Pattern: Double Top/Bottom using zigzag
        if (params.zigzag.enabled) {
            const zigzagValues = zigzag(ohlcv, params.zigzag.deviation); // Array of swing points
            const lastSwings = zigzagValues.slice(-5); // Last 5 swing points
            if (lastSwings.length >= 5) {
                const [s1, s2, s3, s4, s5] = lastSwings; // s1 is oldest, s5 is newest
                const isDoubleTop = s3 > s2 && s3 > s4 && Math.abs(s3 - s5) / s3 < 0.01 && s2 < s3 && s4 < s5 && currentPrice < s4;
                const isDoubleBottom = s3 < s2 && s3 < s4 && Math.abs(s3 - s5) / s3 < 0.01 && s2 > s3 && s4 > s5 && currentPrice > s4;
                
                if (isDoubleTop) {
                    patterns.push({ signal: -1, strength: 0.85, pattern: 'Double Top' });
                } else if (isDoubleBottom) {
                    patterns.push({ signal: 1, strength: 0.85, pattern: 'Double Bottom' });
                }
            }
        }

        // New Pattern: Symmetrical Triangle using zigzag
        if (params.zigzag.enabled) {
            const zigzagValues = zigzag(ohlcv, params.zigzag.deviation);
            const lastSwings = zigzagValues.slice(-10); // Last 10 swing points
            if (lastSwings.length >= 6) {
                const highs = lastSwings.filter((_, i) => i % 2 === 0); // Even indices are highs
                const lows = lastSwings.filter((_, i) => i % 2 !== 0); // Odd indices are lows
                if (highs.length >= 3 && lows.length >= 3) {
                    const isConvergingHighs = highs.every((h, i) => i > 0 ? h < highs[i-1] : true);
                    const isConvergingLows = lows.every((l, i) => i > 0 ? l > lows[i-1] : true);
                    if (isConvergingHighs && isConvergingLows) {
                        const latestHigh = highs[highs.length - 1];
                        const latestLow = lows[lows.length - 1];
                        if (currentPrice > latestHigh) {
                            patterns.push({ signal: 1, strength: 0.85, pattern: 'Symmetrical Triangle Breakout (Bullish)' });
                        } else if (currentPrice < latestLow) {
                            patterns.push({ signal: -1, strength: 0.85, pattern: 'Symmetrical Triangle Breakout (Bearish)' });
                        }
                    }
                }
            }
        }

        // New Pattern: Channels using zigzag
        if (params.zigzag.enabled) {
            const zigzagValues = zigzag(ohlcv, params.zigzag.deviation);
            const lastSwings = zigzagValues.slice(-8); // Last 8 swing points
            if (lastSwings.length >= 6) {
                const highs = lastSwings.filter((_, i) => i % 2 === 0).slice(-3); // Last 3 highs
                const lows = lastSwings.filter((_, i) => i % 2 !== 0).slice(-3); // Last 3 lows
                if (highs.length >= 2 && lows.length >= 2) {
                    const highTimes = highs.map((_, i) => i);
                    const lowTimes = lows.map((_, i) => i);
                    const highSlope = (highs[highs.length - 1] - highs[0]) / (highTimes[highTimes.length - 1] - highTimes[0]);
                    const lowSlope = (lows[lows.length - 1] - lows[0]) / (lowTimes[lowTimes.length - 1] - lowTimes[0]);
                    const isParallel = Math.abs((highSlope - lowSlope) / (Math.abs(highSlope) || 1)) < 0.1;
                    if (isParallel) {
                        const latestHigh = highs[highs.length - 1];
                        const latestLow = lows[lows.length - 1];
                        const currentIndex = highTimes[highTimes.length - 1] + 1;
                        const upperTrendline = latestHigh + highSlope * (currentIndex - highTimes[highTimes.length - 1]);
                        const lowerTrendline = latestLow + lowSlope * (currentIndex - lowTimes[lowTimes.length - 1]);
                        if (currentPrice > upperTrendline) {
                            patterns.push({ signal: 1, strength: 0.8, pattern: 'Channel Breakout (Bullish)' });
                        } else if (currentPrice < lowerTrendline) {
                            patterns.push({ signal: -1, strength: 0.8, pattern: 'Channel Breakout (Bearish)' });
                        } else if (currentPrice >= lowerTrendline && currentPrice <= upperTrendline) {
                            patterns.push({ signal: 0, strength: 0.7, pattern: 'Within Channel' });
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error during chart pattern detection:', error);
    }

    if (patterns.length === 0) {
        return { signal: 0, strength: 0, pattern: 'None' };
    }
    const strongest = patterns.reduce((max, p) => p.strength > max.strength ? p : max, patterns[0]);
    return strongest;
}

export function calculatePriceLevels(candles, signalScore, signal) {
    // Extract data from candles
    const params = getIndicatorParams();
    const closes = candles.map(c => Number(c[4])); // Close prices
    const highs = candles.map(c => Number(c[2]));  // High prices
    const lows = candles.map(c => Number(c[3]));   // Low prices
    const ohlcv = candles.map(c => [
        Number(c[1]), // Open
        Number(c[2]), // High
        Number(c[3]), // Low
        Number(c[4]), // Close
        Number(c[5])  // Volume
    ]);
    const currentPrice = closes[closes.length - 1];
    const feePercent = parseFloat(document.getElementById('input-fee').value) || 0;
    const tradeSize = parseFloat(document.getElementById('input-trade-size').value) || 1000;
    let atr = 0;

    // Calculate ATR for take profit estimation
    try {
        const atrValues = atr(ohlcv, 14);
        atr = atrValues[atrValues.length - 1] || 0.01;
    } catch (error) {
        console.error('Error calculating ATR:', error);
        atr = 0.01; // Fallback value
    }

    // Get user-defined lookback period
    const lookback = parseInt(document.getElementById('support-resistance-lookback').value) || 20;

    // Calculate support and resistance using ta.js with fallback
    let supportPrice, resistancePrice;
    try {
        supportPrice = support(closes, lookback);
        resistancePrice = resistance(closes, lookback);
        if (!isFinite(supportPrice) || supportPrice <= 0) throw new Error('Invalid support price');
        if (!isFinite(resistancePrice) || resistancePrice <= 0) throw new Error('Invalid resistance price');
    } catch (error) {
        console.warn('ta.js support/resistance failed, using fallback method:', error);
        const recentCloses = closes.slice(-lookback);
        supportPrice = Math.min(...recentCloses);
        resistancePrice = Math.max(...recentCloses);
    }

    // Ensure positive prices
    supportPrice = Math.max(supportPrice, 0.0001);
    resistancePrice = Math.max(resistancePrice, 0.0001);

    // Parse signal type and strength
    const { type, strength } = parseSignal(signal);

    let entryPrice, takeProfit, stopLoss, potentialEntryPrice;

    if (type === 'Buy') {
        if (strength === 'Very Weak') {
            const percentage = Math.min(
                parseFloat(document.getElementById('buy-very-weak-below-support').value) / 100,
                0.9999
            );
            entryPrice = supportPrice * (1 - percentage);
        } else if (strength === 'Weak') {
            entryPrice = supportPrice;
        } else if (strength === 'Moderate') {
            const percentage = parseFloat(document.getElementById('buy-moderate-above-support').value) / 100;
            entryPrice = supportPrice * (1 + percentage);
        } else if (strength === 'Strong') {
            entryPrice = currentPrice;
            const percentage = parseFloat(document.getElementById('buy-strong-above-current').value) / 100;
            takeProfit = currentPrice * (1 + percentage); // Upper end of the range
        }
        // Set stop loss for buy signal
        let stopLossPercentage = parseFloat(document.getElementById('stop-loss-buy').value) / 100;
        if (!isFinite(stopLossPercentage) || stopLossPercentage < 0) {
            console.warn(`Invalid Buy Stop Loss Percentage: ${stopLossPercentage}. Using default 1%.`);
            stopLossPercentage = 0.01; // Default to 1%
        }
        stopLoss = entryPrice * (1 - stopLossPercentage); // Below entry price
        if (stopLoss > entryPrice) {
            console.warn(`Buy Stop Loss (${stopLoss.toFixed(8)}) exceeds Entry Price (${entryPrice.toFixed(8)}). Capping at Entry Price.`);
            stopLoss = entryPrice; // Cap at entry price
        }
        stopLoss = Math.max(stopLoss, 0.0001); // Ensure positive stop loss
        // Set take profit if not already set (for non-strong signals)
        if (!takeProfit) {
            takeProfit = entryPrice + (atr * 3); // Default take profit using ATR
        }
        // No potential entry price for buy signals
        potentialEntryPrice = null;
    } else if (type === 'Sell') {
        if (strength === 'Strong') {
            entryPrice = currentPrice; // Sell immediately at current price
            const percentage = parseFloat(document.getElementById('sell-strong-below-current').value) / 100;
            takeProfit = currentPrice * (1 - percentage); // Exit price
            const newEntryPercentage = Math.min(
                parseFloat(document.getElementById('buy-very-weak-below-support').value) / 100,
                0.9999
            );
            potentialEntryPrice = supportPrice * (1 - newEntryPercentage); // Inverse of very weak buy
        } else if (strength === 'Moderate') {
            const percentage = parseFloat(document.getElementById('sell-moderate-above-current').value) / 100;
            takeProfit = currentPrice * (1 + percentage);
            entryPrice = takeProfit; // Sell at this higher price
            potentialEntryPrice = supportPrice; // Inverse of weak buy
        } else if (strength === 'Weak') {
            takeProfit = resistancePrice;
            entryPrice = takeProfit;
            const newEntryPercentage = parseFloat(document.getElementById('buy-moderate-above-support').value) / 100;
            potentialEntryPrice = supportPrice * (1 + newEntryPercentage); // Inverse of moderate buy
        } else if (strength === 'Very Weak') {
            const percentage = parseFloat(document.getElementById('sell-very-weak-above-resistance').value) / 100;
            takeProfit = resistancePrice * (1 + percentage);
            entryPrice = takeProfit;
            const newEntryPercentage = parseFloat(document.getElementById('sell-very-weak-new-entry-below-current').value) / 100;
            potentialEntryPrice = currentPrice * (1 - newEntryPercentage); // Inverse of strong buy, 1%
        }
        // Set stop loss for sell signal
        let stopLossPercentage = parseFloat(document.getElementById('stop-loss-sell').value) / 100;
        if (!isFinite(stopLossPercentage) || stopLossPercentage < 0) {
            console.warn(`Invalid Sell Stop Loss Percentage: ${stopLossPercentage}. Using default 0.5%.`);
            stopLossPercentage = 0.005; // Default to 0.5%
        }
        stopLoss = currentPrice * (1 - stopLossPercentage);
        if (stopLoss > entryPrice) {
            console.warn(`Sell Stop Loss (${stopLoss.toFixed(8)}) exceeds Entry Price (${entryPrice.toFixed(8)}). Capping at Entry Price.`);
            stopLoss = entryPrice; // Cap at entry price
        }
        stopLoss = Math.max(stopLoss, 0.0001); // Ensure positive stop loss
    } else {
        // Hold signal
        entryPrice = currentPrice;
        takeProfit = null;
        stopLoss = null;
        potentialEntryPrice = null;
    }

    // Validate all prices to prevent negative values
    entryPrice = Math.max(entryPrice, 0.0001);
    if (takeProfit !== null) takeProfit = Math.max(takeProfit, 0.0001);
    if (stopLoss !== null) stopLoss = Math.max(stopLoss, 0.0001);
    if (potentialEntryPrice !== null) potentialEntryPrice = Math.max(potentialEntryPrice, 0.0001);

    // Calculate risk-reward ratio
    const riskRewardRatio = (stopLoss && takeProfit && entryPrice !== stopLoss)
        ? Math.abs((takeProfit - entryPrice) / (entryPrice - stopLoss)).toFixed(2)
        : 'N/A';

    // Calculate potential profit/loss
    let profitLoss = null;
    if (type === 'Buy' && takeProfit && stopLoss) {
        const tokensBought = tradeSize / entryPrice;
        const fee = tradeSize * (feePercent / 100);
        const profit = (tokensBought * takeProfit) - tradeSize - (2 * fee); // Profit if sold at take-profit
        const loss = (tokensBought * stopLoss) - tradeSize - (2 * fee); // Loss if sold at stop-loss
        profitLoss = { 
            profit: profit.toFixed(2), 
            loss: loss.toFixed(2),
            profitPercent: ((profit / tradeSize) * 100).toFixed(2),
            lossPercent: ((loss / tradeSize) * 100).toFixed(2)
        };
    } else if (type === 'Sell' && potentialEntryPrice && stopLoss) {
        const tokensHeld = tradeSize / currentPrice; // Assume position bought at current price
        const fee = tradeSize * (feePercent / 100);
        const loss = (tokensHeld * potentialEntryPrice) - tradeSize - (2 * fee); // Loss if held to potential entry
        profitLoss = { 
            loss: loss.toFixed(2),
            lossPercent: ((loss / tradeSize) * 100).toFixed(2)
        };
    }

    // Format prices for return
    return {
        entryPrice: entryPrice.toFixed(8),
        takeProfit: takeProfit ? takeProfit.toFixed(8) : 'N/A',
        stopLoss: stopLoss ? stopLoss.toFixed(8) : 'N/A',
        potentialEntryPrice: potentialEntryPrice ? potentialEntryPrice.toFixed(8) : 'N/A',
        riskRewardRatio,
        supportPrice: supportPrice.toFixed(8),
        resistancePrice: resistancePrice.toFixed(8),
        profitLoss, // For buy: profit/loss; for sell: loss only
        signal
    };
}

export function parseSignal(signal) {
    const parts = signal.split(' ');
    if (parts.length >= 2) {
        const strength = parts[0] === 'Very' ? `${parts[0]} ${parts[1]}` : parts[0];
        const type = parts[parts.length - 1];
        return { type, strength };
    }
    return { type: 'Hold', strength: '' };
}
