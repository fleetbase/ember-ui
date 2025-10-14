import { helper } from '@ember/component/helper';
import isUuidUtil from '@fleetbase/ember-core/utils/is-uuid';

export default helper(function isUuid([str]) {
    return isUuidUtil(str);
});
