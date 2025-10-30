import { helper } from '@ember/component/helper';
import isEmptyObject from '@fleetbase/ember-core/utils/is-empty-object';

export default helper(function isObjectEmpty([subject]) {
    return isEmptyObject(subject);
});
