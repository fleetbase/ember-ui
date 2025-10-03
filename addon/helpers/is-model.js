import { helper } from '@ember/component/helper';
import isModelUtil from '@fleetbase/ember-core/utils/is-model';

export default helper(function isModel([model]) {
    return isModelUtil(model);
});
