// js/utils.js
        // Timezone Handling
export let currentTimezone = 'UTC';
        
export function formatUnixTimestamp(ms) {
            if (!ms) return '';
            const date = new Date(parseInt(ms));
            if (currentTimezone === 'WAT') {
                date.setHours(date.getHours() + 1);
            }
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')} ${currentTimezone}`;
        }
