import formatDateUtil from '../utils/format-date';
import { helper } from '@ember/component/helper';
import { isBlank } from '@ember/utils';
import { parse } from 'date-fns';

export default helper(function formatDate([dateInstance, formatString = 'PPP p', parse = null]) {
    if (typeof formatString === 'object' && !isBlank(formatString)) {
        parse = formatString;
        formatString = 'PPP p';
    }
    
    if (typeof dateInstance === 'string') {
        if (!isBlank(parse) && typeof parse.formatString === 'string') {
            dateInstance = parse(dateInstance, parse.formatString, new Date(), parse.options ?? {});
        } else {
            dateInstance = new Date(dateInstance);
        }
    }

    return formatDateUtil(dateInstance, formatString);
});
