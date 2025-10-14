import { helper } from '@ember/component/helper';

/**
 * Usage:
 *   @onChange={{set-model-attr @model "attrName"}}
 *   @onChange={{set-model-attr @issue "type" prop="code"}}
 *
 * The selected object will be passed to the callback, and we set model[attr] = selected[prop].
 */
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
