// js/chart.js
import { calculateIndicatorChartData } from './indicators.js';
import { getIndicatorParams } from './ui.js';
import { formatUnixTimestamp } from './utils.js';

export let chart = null;
export let candlestickSeries = null;
export let supportLine = null;
export let resistanceLine = null;
export let stopLossLine = null;
export let takeProfitLine = null;
export let indicatorSeries = {};

export function initializeChart() {
    const chartContainer = document.getElementById('chart-container');
    if (!chartContainer) {
        console.warn('Chart container (#chart-container) not found.');
        return false;
    }

    if (typeof LightweightCharts === 'undefined') {
        console.error('Lightweight Charts library not loaded.');
        document.getElementById('success').className = 'error';
        document.getElementById('success').textContent = 'Error: Chart library not loaded. Check your network.';
        return false;
    }

    // Clear existing chart if it exists
    if (chart) {
        chart.remove();
        chart = null;
        candlestickSeries = null;
        supportLine = null;
        resistanceLine = null;
        stopLossLine = null;
        takeProfitLine = null;
    }

    try {
        chart = LightweightCharts.createChart(chartContainer, {
            width: chartContainer.clientWidth,
            height: chartContainer.clientHeight || 400,
            layout: {
                background: { color: '#2a2a2a' },
                textColor: '#e0e0e0',
            },
            grid: {
                vertLines: { color: '#444' },
                horzLines: { color: '#444' },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
            rightPriceScale: {
                borderColor: '#444',
            },
        });

        candlestickSeries = chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        // Add resize event listener with debounce
        function debounce(func, wait) {
            let timeout;
            return function (...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }

        const chartResizeHandler = debounce(() => {
            if (chart && chartContainer) {
                chart.resize(chartContainer.clientWidth, chartContainer.clientHeight || 400);
            }
        }, 100);

        window.addEventListener('resize', chartResizeHandler);

        return true;
    } catch (error) {
        console.error('Error initializing chart:', error);
        chart = null;
        candlestickSeries = null;
        return false;
    }
}

export function updateChart(candles, priceLevels = null) {
    if (!chart || !candlestickSeries) {
        if (!initializeChart()) {
            console.warn('Skipping chart update: Initialization failed.');
            document.getElementById('success').className = 'error';
            document.getElementById('success').textContent = 'Error: Unable to initialize chart.';
            return;
        }
    }

    // Prepare candlestick data
    const chartData = candles
        .map(c => {
            const time = Number(c[0]) / 1000; // Convert ms to seconds
            const open = Number(c[1]);
            const high = Number(c[2]);
            const low = Number(c[3]);
            const close = Number(c[4]);

            if (
                isNaN(time) || time <= 0 ||
                isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) ||
                high < low || open < 0 || close < 0
            ) {
                console.warn('Invalid candle data:', c);
                return null;
            }

            return { time, open, high, low, close };
        })
        .filter(c => c !== null);

    if (chartData.length === 0) {
        console.warn('No valid chart data available.');
        document.getElementById('success').className = 'error';
        document.getElementById('success').textContent = 'Error: No valid chart data to display';
        return;
    }

    candlestickSeries.setData(chartData);

    // Clear existing price lines
    if (supportLine) { supportLine.remove(); supportLine = null; }
    if (resistanceLine) { resistanceLine.remove(); resistanceLine = null; }
    if (stopLossLine) { stopLossLine.remove(); stopLossLine = null; }
    if (takeProfitLine) { takeProfitLine.remove(); takeProfitLine = null; }

    // Add price lines if provided
    if (priceLevels && priceLevels.buyPrice && priceLevels.sellPrice && priceLevels.stopLoss && priceLevels.takeProfit) {
        const buyPrice = Number(priceLevels.buyPrice);
        const sellPrice = Number(priceLevels.sellPrice);
        const stopLoss = Number(priceLevels.stopLoss);
        const takeProfit = Number(priceLevels.takeProfit);

        if (
            !isNaN(buyPrice) && buyPrice > 0 &&
            !isNaN(sellPrice) && sellPrice > 0 &&
            !isNaN(stopLoss) && stopLoss > 0 &&
            !isNaN(takeProfit) && takeProfit > 0
        ) {
            supportLine = candlestickSeries.createPriceLine({
                price: buyPrice,
                color: '#28a745',
                lineWidth: 1,
                lineStyle: LightweightCharts.LineStyle.Dashed,
                title: 'Support',
            });
            resistanceLine = candlestickSeries.createPriceLine({
                price: sellPrice,
                color: '#dc3545',
                lineWidth: 1,
                lineStyle: LightweightCharts.LineStyle.Dashed,
                title: 'Resistance',
            });
            stopLossLine = candlestickSeries.createPriceLine({
                price: stopLoss,
                color: '#ff4500',
                lineWidth: 1,
                lineStyle: LightweightCharts.LineStyle.Dotted,
                title: 'Stop-Loss',
            });
            takeProfitLine = candlestickSeries.createPriceLine({
                price: takeProfit,
                color: '#1e90ff',
                lineWidth: 1,
                lineStyle: LightweightCharts.LineStyle.Dotted,
                title: 'Take-Profit',
            });
        } else {
            console.warn('Invalid price levels:', priceLevels);
        }
    }

    // Clear existing indicator series (except candlestick)
    const existingSeries = chart.getSeries();
    existingSeries.forEach(series => {
        if (series !== candlestickSeries) {
            chart.removeSeries(series);
        }
    });

    // Calculate indicator data
    const params = getIndicatorParams();
    const indicatorData = calculateIndicatorChartData(candles, params);

    // Add indicator series
    if (indicatorData.rsi) {
        const rsiSeries = chart.addLineSeries({ color: '#ff9800', lineWidth: 1 });
        rsiSeries.setData(indicatorData.rsi);
    }
    if (indicatorData.stochastic_k) {
        const stochKSeries = chart.addLineSeries({ color: '#2196f3', lineWidth: 1 });
        stochKSeries.setData(indicatorData.stochastic_k);
        const stochDSeries = chart.addLineSeries({ color: '#f44336', lineWidth: 1 });
        stochDSeries.setData(indicatorData.stochastic_d);
    }
    if (indicatorData.macd) {
        const macdSeries = chart.addLineSeries({ color: '#3f51b5', lineWidth: 1 });
        macdSeries.setData(indicatorData.macd);
        const macdSignalSeries = chart.addLineSeries({ color: '#ff5722', lineWidth: 1 });
        macdSignalSeries.setData(indicatorData.macd_signal);
        const macdHistogramSeries = chart.addHistogramSeries({ color: '#4caf50' });
        macdHistogramSeries.setData(indicatorData.macd_histogram);
    }
    if (indicatorData.atr) {
        const atrSeries = chart.addLineSeries({ color: '#9c27b0', lineWidth: 1 });
        atrSeries.setData(indicatorData.atr);
    }
    if (indicatorData.ema_short) {
        const emaShortSeries = chart.addLineSeries({ color: '#00bcd4', lineWidth: 1 });
        emaShortSeries.setData(indicatorData.ema_short);
        const emaLongSeries = chart.addLineSeries({ color: '#e91e63', lineWidth: 1 });
        emaLongSeries.setData(indicatorData.ema_long);
    }
    if (indicatorData.ma) {
        const maSeries = chart.addLineSeries({ color: '#ffeb3b', lineWidth: 1 });
        maSeries.setData(indicatorData.ma);
    }
    if (indicatorData.bollinger_upper) {
        const bollingerUpperSeries = chart.addLineSeries({ color: '#8bc34a', lineWidth: 1 });
        bollingerUpperSeries.setData(indicatorData.bollinger_upper);
        const bollingerMiddleSeries = chart.addLineSeries({ color: '#607d8b', lineWidth: 1 });
        bollingerMiddleSeries.setData(indicatorData.bollinger_middle);
        const bollingerLowerSeries = chart.addLineSeries({ color: '#8bc34a', lineWidth: 1 });
        bollingerLowerSeries.setData(indicatorData.bollinger_lower);
    }
    if (indicatorData.aroon_up) {
        const aroonUpSeries = chart.addLineSeries({ color: '#4caf50', lineWidth: 1 });
        aroonUpSeries.setData(indicatorData.aroon_up);
        const aroonDownSeries = chart.addLineSeries({ color: '#f44336', lineWidth: 1 });
        aroonDownSeries.setData(indicatorData.aroon_down);
    }
    if (indicatorData.pivot) {
        indicatorData.pivot.forEach((level, i) => {
            const pivotSeries = chart.addLineSeries({ color: i === 0 ? '#ff9800' : i === 1 ? '#f44336' : '#2196f3', lineWidth: 1 });
            pivotSeries.setData([level]);
        });
    }
    if (indicatorData.volume) {
        const volumeSeries = chart.addHistogramSeries({ color: '#26a69a' });
        volumeSeries.setData(indicatorData.volume);
    }
    if (indicatorData.ichimoku_tenkan) {
        const tenkanSeries = chart.addLineSeries({ color: '#2196f3', lineWidth: 1 });
        tenkanSeries.setData(indicatorData.ichimoku_tenkan);
        const kijunSeries = chart.addLineSeries({ color: '#f44336', lineWidth: 1 });
        kijunSeries.setData(indicatorData.ichimoku_kijun);
        const senkouASeries = chart.addLineSeries({ color: '#4caf50', lineWidth: 1 });
        senkouASeries.setData(indicatorData.ichimoku_senkou_a);
        const senkouBSeries = chart.addLineSeries({ color: '#ff9800', lineWidth: 1 });
        senkouBSeries.setData(indicatorData.ichimoku_senkou_b);
    }
    if (indicatorData.fib) {
        indicatorData.fib.forEach(level => {
            const fibSeries = chart.addLineSeries({ color: '#ffeb3b', lineWidth: 1 });
            fibSeries.setData([level]);
        });
    }
    if (indicatorData.cci) {
        const cciSeries = chart.addLineSeries({ color: '#e91e63', lineWidth: 1 });
        cciSeries.setData(indicatorData.cci);
    }
    if (indicatorData.obv) {
        const obvSeries = chart.addLineSeries({ color: '#00bcd4', lineWidth: 1 });
        obvSeries.setData(indicatorData.obv);
    }
    if (indicatorData.chaikin_osc) {
        const chaikinSeries = chart.addLineSeries({ color: '#9c27b0', lineWidth: 1 });
        chaikinSeries.setData(indicatorData.chaikin_osc);
    }
    if (indicatorData.supertrend) {
        const supertrendSeries = chart.addLineSeries({ color: '#4caf50', lineWidth: 1 });
        supertrendSeries.setData(indicatorData.supertrend);
    }
    if (indicatorData.psar) {
        const psarSeries = chart.addLineSeries({ color: '#ff5722', lineWidth: 1 });
        psarSeries.setData(indicatorData.psar);
    }
    if (indicatorData.fractals) {
        const fractalsSeries = chart.addLineSeries({ color: '#3f51b5', lineWidth: 1 });
        fractalsSeries.setData(indicatorData.fractals);
    }
    if (indicatorData.zigzag) {
        const zigzagSeries = chart.addLineSeries({ color: '#ff9800', lineWidth: 1 });
        zigzagSeries.setData(indicatorData.zigzag);
    }
    if (indicatorData.ha) {
        const haSeries = chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350'
        });
        haSeries.setData(indicatorData.ha);
    }
    if (indicatorData.don_upper) {
        const donUpperSeries = chart.addLineSeries({ color: '#2196f3', lineWidth: 1 });
        donUpperSeries.setData(indicatorData.don_upper);
        const donMiddleSeries = chart.addLineSeries({ color: '#607d8b', lineWidth: 1 });
        donMiddleSeries.setData(indicatorData.don_middle);
        const donLowerSeries = chart.addLineSeries({ color: '#f44336', lineWidth: 1 });
        donLowerSeries.setData(indicatorData.don_lower);
    }
    if (indicatorData.fibbands) {
        const fibbandsSeries = chart.addLineSeries({ color: '#ffeb3b', lineWidth: 1 });
        fibbandsSeries.setData(indicatorData.fibbands);
        const vwmaSeries = chart.addLineSeries({ color: '#8bc34a', lineWidth: 1 });
        vwmaSeries.setData(indicatorData.vwma);
    }
    if (indicatorData.envelope_upper) {
        const envelopeUpperSeries = chart.addLineSeries({ color: '#00bcd4', lineWidth: 1 });
        envelopeUpperSeries.setData(indicatorData.envelope_upper);
        const envelopeMiddleSeries = chart.addLineSeries({ color: '#607d8b', lineWidth: 1 });
        envelopeMiddleSeries.setData(indicatorData.envelope_middle);
        const envelopeLowerSeries = chart.addLineSeries({ color: '#e91e63', lineWidth: 1 });
        envelopeLowerSeries.setData(indicatorData.envelope_lower);
    }

    chart.timeScale().fitContent();
}

export function updateChartWithSignal(signalResult, candles) {
    
    document.getElementById('chart-data-container').style.display = 'block';
    
    if (!initializeChart()) {
        console.warn('Skipping chart update: Initialization failed.');
        document.getElementById('success').className = 'error';
        document.getElementById('success').textContent = 'Error: Unable to initialize chart.';
        return;
    }
    updateChart(candles, signalResult.priceLevels);
    updateChartLegend(candles, signalResult.priceLevels);
}

export function updateChartLegend(candles, priceLevels = null) {
    const params = getIndicatorParams();
    const indicatorData = calculateIndicatorChartData(candles, params);
    const closes = candles.map(c => Number(c[4]));
    const latestClose = closes[closes.length - 1];
    const latestTime = candles[candles.length - 1][0];

    // Create or update legend container
    let legendContainer = document.getElementById('chart-legend');
    if (!legendContainer) {
        legendContainer = document.createElement('div');
        legendContainer.id = 'chart-legend';
        legendContainer.style.position = 'absolute';
        legendContainer.style.top = '10px';
        legendContainer.style.left = '10px';
        legendContainer.style.backgroundColor = 'rgba(42, 42, 42, 0.8)';
        legendContainer.style.color = '#e0e0e0';
        legendContainer.style.padding = '10px';
        legendContainer.style.borderRadius = '4px';
        legendContainer.style.fontSize = '12px';
        legendContainer.style.zIndex = '1000';
        document.getElementById('chart-container').appendChild(legendContainer);
    }

    // Build legend content
    let legendHtml = `<strong>${formatUnixTimestamp(latestTime)}</strong><br>`;
    legendHtml += `Close: ${latestClose.toFixed(2)}<br>`;

    // Price Levels
    if (priceLevels) {
        legendHtml += `Support: ${Number(priceLevels.buyPrice).toFixed(2)}<br>`;
        legendHtml += `Resistance: ${Number(priceLevels.sellPrice).toFixed(2)}<br>`;
        legendHtml += `Stop-Loss: ${Number(priceLevels.stopLoss).toFixed(2)}<br>`;
        legendHtml += `Take-Profit: ${Number(priceLevels.takeProfit).toFixed(2)}<br>`;
    }

    // Indicators
    if (indicatorData.rsi) {
        const value = indicatorData.rsi[indicatorData.rsi.length - 1]?.value;
        if (value) legendHtml += `RSI: ${value.toFixed(2)}<br>`;
    }
    if (indicatorData.stochastic_k) {
        const kValue = indicatorData.stochastic_k[indicatorData.stochastic_k.length - 1]?.value;
        const dValue = indicatorData.stochastic_d[indicatorData.stochastic_d.length - 1]?.value;
        if (kValue && dValue) legendHtml += `Stochastic %K: ${kValue.toFixed(2)}, %D: ${dValue.toFixed(2)}<br>`;
    }
    if (indicatorData.macd) {
        const macdValue = indicatorData.macd[indicatorData.macd.length - 1]?.value;
        const signalValue = indicatorData.macd_signal[indicatorData.macd_signal.length - 1]?.value;
        const histValue = indicatorData.macd_histogram[indicatorData.macd_histogram.length - 1]?.value;
        if (macdValue && signalValue && histValue) {
            legendHtml += `MACD: ${macdValue.toFixed(2)}, Signal: ${signalValue.toFixed(2)}, Hist: ${histValue.toFixed(2)}<br>`;
        }
    }
    if (indicatorData.atr) {
        const value = indicatorData.atr[indicatorData.atr.length - 1]?.value;
        if (value) legendHtml += `ATR: ${value.toFixed(2)}<br>`;
    }
    if (indicatorData.ema_short) {
        const shortValue = indicatorData.ema_short[indicatorData.ema_short.length - 1]?.value;
        const longValue = indicatorData.ema_long[indicatorData.ema_long.length - 1]?.value;
        if (shortValue && longValue) legendHtml += `EMA Short: ${shortValue.toFixed(2)}, Long: ${longValue.toFixed(2)}<br>`;
    }
    if (indicatorData.ma) {
        const value = indicatorData.ma[indicatorData.ma.length - 1]?.value;
        if (value) legendHtml += `MA: ${value.toFixed(2)}<br>`;
    }
    if (indicatorData.bollinger_upper) {
        const upperValue = indicatorData.bollinger_upper[indicatorData.bollinger_upper.length - 1]?.value;
        const middleValue = indicatorData.bollinger_middle[indicatorData.bollinger_middle.length - 1]?.value;
        const lowerValue = indicatorData.bollinger_lower[indicatorData.bollinger_lower.length - 1]?.value;
        if (upperValue && middleValue && lowerValue) {
            legendHtml += `Bollinger Upper: ${upperValue.toFixed(2)}, Middle: ${middleValue.toFixed(2)}, Lower: ${lowerValue.toFixed(2)}<br>`;
        }
    }
    if (indicatorData.aroon_up) {
        const upValue = indicatorData.aroon_up[indicatorData.aroon_up.length - 1]?.value;
        const downValue = indicatorData.aroon_down[indicatorData.aroon_down.length - 1]?.value;
        if (upValue && downValue) legendHtml += `Aroon Up: ${upValue.toFixed(2)}, Down: ${downValue.toFixed(2)}<br>`;
    }
    if (indicatorData.pivot) {
        const ppValue = indicatorData.pivot[0]?.value;
        const r1Value = indicatorData.pivot[1]?.value;
        const s1Value = indicatorData.pivot[2]?.value;
        if (ppValue && r1Value && s1Value) {
            legendHtml += `Pivot PP: ${ppValue.toFixed(2)}, R1: ${r1Value.toFixed(2)}, S1: ${s1Value.toFixed(2)}<br>`;
        }
    }
    if (indicatorData.volume) {
        const value = indicatorData.volume[indicatorData.volume.length - 1]?.value;
        if (value) legendHtml += `Volume: ${value.toFixed(2)}<br>`;
    }
    if (indicatorData.ichimoku_tenkan) {
        const tenkanValue = indicatorData.ichimoku_tenkan[indicatorData.ichimoku_tenkan.length - 1]?.value;
        const kijunValue = indicatorData.ichimoku_kijun[indicatorData.ichimoku_kijun.length - 1]?.value;
        if (tenkanValue && kijunValue) {
            legendHtml += `Ichimoku Tenkan: ${tenkanValue.toFixed(2)}, Kijun: ${kijunValue.toFixed(2)}<br>`;
        }
    }
    if (indicatorData.fib) {
        const fibValues = indicatorData.fib.map(f => f.value.toFixed(2)).join(', ');
        if (fibValues) legendHtml += `Fib Levels: ${fibValues}<br>`;
    }
    if (indicatorData.cci) {
        const value = indicatorData.cci[indicatorData.cci.length - 1]?.value;
        if (value) legendHtml += `CCI: ${value.toFixed(2)}<br>`;
    }
    if (indicatorData.obv) {
        const value = indicatorData.obv[indicatorData.obv.length - 1]?.value;
        if (value) legendHtml += `OBV: ${value.toFixed(2)}<br>`;
    }
    if (indicatorData.chaikin_osc) {
        const value = indicatorData.chaikin_osc[indicatorData.chaikin_osc.length - 1]?.value;
        if (value) legendHtml += `Chaikin Osc: ${value.toFixed(2)}<br>`;
    }
    if (indicatorData.supertrend) {
        const value = indicatorData.supertrend[indicatorData.supertrend.length - 1]?.value;
        if (value) legendHtml += `Supertrend: ${value.toFixed(2)}<br>`;
    }
    if (indicatorData.psar) {
        const value = indicatorData.psar[indicatorData.psar.length - 1]?.value;
        if (value) legendHtml += `PSAR: ${value.toFixed(2)}<br>`;
    }
    if (indicatorData.fractals) {
        const value = indicatorData.fractals[indicatorData.fractals.length - 1]?.value;
        if (value) legendHtml += `Fractal: ${value.toFixed(2)}<br>`;
    }
    if (indicatorData.zigzag) {
        const value = indicatorData.zigzag[indicatorData.zigzag.length - 1]?.value;
        if (value) legendHtml += `ZigZag: ${value.toFixed(2)}<br>`;
    }
    if (indicatorData.ha) {
        const haCandle = indicatorData.ha[indicatorData.ha.length - 1];
        if (haCandle) legendHtml += `Heikin Ashi Close: ${haCandle.close.toFixed(2)}<br>`;
    }
    if (indicatorData.don_upper) {
        const upperValue = indicatorData.don_upper[indicatorData.don_upper.length - 1]?.value;
        const middleValue = indicatorData.don_middle[indicatorData.don_middle.length - 1]?.value;
        const lowerValue = indicatorData.don_lower[indicatorData.don_lower.length - 1]?.value;
        if (upperValue && middleValue && lowerValue) {
            legendHtml += `Donchian Upper: ${upperValue.toFixed(2)}, Middle: ${middleValue.toFixed(2)}, Lower: ${lowerValue.toFixed(2)}<br>`;
        }
    }
    if (indicatorData.fibbands) {
        const fibValue = indicatorData.fibbands[indicatorData.fibbands.length - 1]?.value;
        const vwmaValue = indicatorData.vwma[indicatorData.vwma.length - 1]?.value;
        if (fibValue && vwmaValue) legendHtml += `Fib Bands: ${fibValue.toFixed(2)}, VWMA: ${vwmaValue.toFixed(2)}<br>`;
    }
    if (indicatorData.envelope_upper) {
        const upperValue = indicatorData.envelope_upper[indicatorData.envelope_upper.length - 1]?.value;
        const middleValue = indicatorData.envelope_middle[indicatorData.envelope_middle.length - 1]?.value;
        const lowerValue = indicatorData.envelope_lower[indicatorData.envelope_lower.length - 1]?.value;
        if (upperValue && middleValue && lowerValue) {
            legendHtml += `Envelope Upper: ${upperValue.toFixed(2)}, Middle: ${middleValue.toFixed(2)}, Lower: ${lowerValue.toFixed(2)}<br>`;
        }
    }

    legendContainer.innerHTML = legendHtml;
}

export { calculateIndicatorChartData }; // Re-export for use in updateChart