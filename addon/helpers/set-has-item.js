import { helper } from '@ember/component/helper';

export default helper(function hasItem([set, key]) {
    return set?.has?.(key);
});
