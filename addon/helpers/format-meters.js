import { helper } from '@ember/component/helper';

export default helper(function formatMeters([meters]) {
    return `${Math.round(meters / 1000)}km`;
});
