import { helper } from '@ember/component/helper';
import { parse, parseISO, format, isValid } from 'date-fns';

export default helper(function formatDateFns([input, fmt], hash = {}) {
    const formatString = typeof fmt === 'string' && fmt.length ? fmt : 'yyyy-MM-dd HH:mm';
    const {
        inputFormat, // e.g. "yyyy-MM-dd HH:mm"
        locale, // a date-fns locale object
        fallback = '', // shown when parsing fails
        unix = false, // force numeric to be seconds since epoch
    } = hash;

    // Fast exits
    if (input == null) return fallback;

    let date;

    // Already a Date?
    if (input instanceof Date) {
        date = input;
    }
    // Numbers / numeric strings (timestamps)
    else if (typeof input === 'number' || (typeof input === 'string' && input.trim() !== '' && !isNaN(Number(input)))) {
        let n = Number(input);
        // If explicitly unix seconds OR we auto-detect "seconds" range
        const looksLikeSeconds = n > 0 && n < 1e12; // < ~Sat Nov 20 33658 in ms; good enough heuristic
        if (unix || looksLikeSeconds) {
            n = n * 1000;
        }
        date = new Date(n);
    }
    // Strings
    else if (typeof input === 'string') {
        const s = input.trim();

        // If user provided an inputFormat, prefer it
        if (inputFormat && s) {
            date = parse(s, inputFormat, new Date(), { locale });
        } else {
            // Try ISO first (most robust); fall back to Date parsing
            date = parseISO(s);
            if (!isValid(date)) {
                date = new Date(s);
            }
        }
    }
    // Unknown types
    else {
        return fallback;
    }

    if (!isValid(date)) {
        return fallback;
    }

    // Finally, format
    try {
        return format(date, formatString, { locale });
    } catch {
        // Bad format token? Return fallback to avoid throwing in templates
        return fallback;
    }
});
