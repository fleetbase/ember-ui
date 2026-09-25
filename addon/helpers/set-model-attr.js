import { helper } from '@ember/component/helper';

/**
 * Usage:
 *   @onChange={{set-model-attr @model "attrName"}}
 *   @onChange={{set-model-attr @issue "type" prop="code"}}
 *
 * The selected object will be passed to the callback, and we set model[attr] = selected[prop].
 */
/* istanbul ignore next -- Glimmer always passes both the positional and named arguments to a
   helper, so this parameter default can never be reached from a template. */
export default helper(function setModelAttr([model, attr], { prop = 'value' } = {}) {
    if (!model || !attr) {
        return () => {};
    }

    return (selected) => {
        if (!selected) {
            model.set(attr, null);
            return;
        }
        const val = selected[prop];
        model.set(attr, val);
    };
});
