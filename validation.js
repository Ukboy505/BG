// js/validation.js
export function validateWeights() {
    const inputs = ['candle-weight', 'chart-weight', 'indicator-weight'];
    let total = 0;
    inputs.forEach(id => {
        const value = parseFloat(document.getElementById(id)?.value) || 0;
        total += value;
    });
    const successElement = document.getElementById('success');
    if (Math.abs(total - 100) > 0.1) {
        successElement.className = 'error';
        successElement.textContent = 'Component weights must sum to 100%.';
        return false;
    }
    successElement.className = '';
    successElement.textContent = '';
    return true;
}

export function validatePercentageInputs() {
    const inputs = document.querySelectorAll('#indicator-settings input[type="number"]:not([id$="-weight"])');
    let isValid = true;
    inputs.forEach(input => {
        const value = parseFloat(input.value);
        const label = input.previousElementSibling.textContent;
        if (value < 0) {
            input.value = 0;
            document.getElementById('success').className = 'error';
            document.getElementById('success').textContent = `${label} cannot be negative.`;
            isValid = false;
        } else if (value > 100) {
            input.value = 100;
            document.getElementById('success').className = 'error';
            document.getElementById('success').textContent = `${label} cannot exceed 100%.`;
            isValid = false;
        }
    });
    return isValid;
}

export function validateLookback() {
    const input = document.getElementById('support-resistance-lookback');
    const value = parseInt(input.value);
    if (value < 5) {
        input.value = 5;
        document.getElementById('success').className = 'error';
        document.getElementById('success').textContent = 'Lookback period must be at least 5 candles.';
        return false;
    } else if (value > 100) {
        input.value = 100;
        document.getElementById('success').className = 'error';
        document.getElementById('success').textContent = 'Lookback period cannot exceed 100 candles.';
        return false;
    }
    return true;
}

export function granularityToSeconds(granularity) {
            const minute = 60, hour = 3600, day = 86400, week = 604800, month = 2592000;
            const map = {
                '1min': minute, '5min': 5 * minute, '15min': 15 * minute,
                '30min': 30 * minute, '1h': hour, '4h': 4 * hour, '6h': 6 * hour,
                '12h': 12 * hour, '1day': day, '3day': 3 * day, '1week': week, '1M': month
            };
            return map[granularity] || minute;
        }