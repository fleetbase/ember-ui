import { helper } from '@ember/component/helper';

export default helper(function jsonStringify(positional, named = {}) {
    const [obj, arg2, arg3] = positional ?? [];

    // figure out replacer (function or array) and space (number)
    let replacer = null;
    let space = 0;

    // named args take precedence
    if (named.replacer !== undefined) replacer = named.replacer;
    if (named.space !== undefined) space = Number(named.space);
    if (named.pretty === true && named.space === undefined) space = 2;

    // fall back to positionals if not provided as named
    if (replacer == null && typeof arg2 === 'function') replacer = arg2;
    if (replacer == null && typeof arg3 === 'function') replacer = arg3;

    if (named.space === undefined) {
        if (typeof arg2 === 'number')
            space = arg2; // (obj, 4)
        else if (typeof arg2 === 'boolean')
            space = arg2 ? 2 : 0; // (obj, true|false)
        else if (typeof arg3 === 'number') space = arg3; // (obj, replacer, 2)
    }

    try {
        return JSON.stringify(obj, replacer ?? null, Number.isFinite(space) ? space : 0);
    } catch (_e) {
        // guard against circulars, etc.
        return '[Unserializable JSON]';
    }
});
