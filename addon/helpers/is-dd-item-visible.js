import { helper } from '@ember/component/helper';
import { isNone } from '@ember/utils';

export default helper(function isDdItemVisible([context, isVisible]) {
    // No visibility rule at all means visible. The old guard was `isNone(context) || !isVisible`,
    // which returned VISIBLE for `isVisible: false` — so a false flag could never hide anything
    // and the boolean branch below was only ever reached with `true`.
    if (isNone(isVisible)) {
        return true;
    }

    if (typeof isVisible === 'boolean') {
        return isVisible;
    }

    // A predicate needs something to decide on; with no context, leave the item visible.
    if (typeof isVisible === 'function') {
        return isNone(context) ? true : isVisible(context);
    }

    return true;
});
