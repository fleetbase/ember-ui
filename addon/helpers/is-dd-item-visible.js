import { helper } from '@ember/component/helper';

export default helper(function isDdItemVisible([row, isVisible]) {
    if (!isVisible) {
        return true;
    }

    if (typeof isVisible === 'boolean') {
        return isVisible;
    }

    if (typeof isVisible === 'function') {
        return isVisible(row);
    }

    return true;
});
