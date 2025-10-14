import { helper } from '@ember/component/helper';

export default helper(function isUrl([value]) {
    if (typeof value !== 'string') return;

    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
});
