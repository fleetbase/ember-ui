import { helper } from '@ember/component/helper';

const noop = () => {};

export default helper(function noop() {
    return noop;
});
