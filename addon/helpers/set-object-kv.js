import { helper } from '@ember/component/helper';

/* eslint-disable no-unused-vars */
export default helper(function setObjectKv([object, key, value]) {
    object = {
        ...object,
        [key]: value,
    };
});
