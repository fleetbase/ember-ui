import { helper } from '@ember/component/helper';
import formatDateUtil from '../utils/format-date';

export default helper(function formatDate([dateInstance, formatString = 'PPP p']) {
    return formatDateUtil(dateInstance, formatString);
});
