import { helper } from '@ember/component/helper';

export default helper(function formatJson([jsonable]) {
    return JSON.stringify(jsonable, null, 2);
});
