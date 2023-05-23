import { helper } from '@ember/component/helper';

const noopFn = () => {};

export default helper(function noop() {
    return noopFn;
});
