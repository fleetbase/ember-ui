import { helper } from '@ember/component/helper';
import { format } from 'date-fns';

export default helper(function formatDate([dateInstance, formatString]) {
    return format(dateInstance, formatString);
});
