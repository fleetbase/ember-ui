import { helper } from '@ember/component/helper';

/* istanbul ignore next -- Glimmer always passes both the positional and named arguments to a
   helper, so this parameter default can never be reached from a template. */
export default helper(function now(positional = []) {
    return new Date(...positional);
});
