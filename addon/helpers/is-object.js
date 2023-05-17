import { helper } from '@ember/component/helper';
import { isArray } from '@ember/array';

export default helper(function isObject([object]) {
    return object !== null && typeof object === 'object' && !isArray(object);
});
