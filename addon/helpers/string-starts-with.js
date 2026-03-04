import { helper } from '@ember/component/helper';

/**
 * {{string-starts-with str prefix}}
 *
 * Returns true if `str` starts with `prefix`. Safe against null/undefined.
 *
 * Example:
 *   {{#if (string-starts-with query.uuid "_new_")}}
 */
export default helper(function stringStartsWith([str, prefix]) {
    if (typeof str !== 'string' || typeof prefix !== 'string') return false;
    return str.startsWith(prefix);
});
