import { helper } from '@ember/component/helper';
import formatDurationUtil from '../utils/format-duration';

export function formatDurationValue(secs) {
    return formatDurationUtil(secs);
}

export default helper(function formatDuration([secs]) {
    return formatDurationValue(secs);
});
