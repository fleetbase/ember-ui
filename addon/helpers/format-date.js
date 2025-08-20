import { helper } from '@ember/component/helper';
import { parse, format } from 'date-fns';
import isObject from '@fleetbase/ember-core/utils/is-object';
import isEmptyObject from '@fleetbase/ember-core/utils/is-empty-object';

export default helper(function formatDate([dateInstance, formatString = 'PPP p', parseOptions = {}]) {
    if (isObject(formatString)) {
        parseOptions = formatString;
        formatString = 'PPP p';
    }

    if (typeof dateInstance === 'string') {
        dateInstance = isEmptyObject(parseOptions) ? new Date(dateInstance) : parse(dateInstance, parseOptions?.formatString ?? formatString, new Date(), parseOptions ?? {});
    }

    return format(dateInstance, formatString);
});
