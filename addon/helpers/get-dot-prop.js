import { helper } from '@ember/component/helper';

export default helper(function getDotProp([object, key]) {
    return object[key];
});
