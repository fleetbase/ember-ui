import { helper } from '@ember/component/helper';
import { isArray } from '@ember/array';

export default helper(function isArray([arg]) {
    return isArray(arg);
});
