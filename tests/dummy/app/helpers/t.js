import { helper } from '@ember/component/helper';

/**
 * Stub of the host console's `{{t}}` translation helper. Echoes the key back,
 * matching the dummy `intl` service's `t(key)` implementation.
 */
export function t([key]) {
    return key ?? '';
}

export default helper(t);
