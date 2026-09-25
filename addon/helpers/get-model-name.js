import { helper } from '@ember/component/helper';
import { w, capitalize } from '@ember/string';
import humanize from '../utils/smart-humanize';

/* istanbul ignore next -- Glimmer always passes both the positional and named arguments to a
   helper, so this parameter default can never be reached from a template. */
export default helper(function getModelName([model, fallback = null], options = {}) {
    let modelName = model.constructor?.modelName ?? model._internalModel?.modelName ?? fallback;

    if (options.humanize === true) {
        modelName = humanize(modelName);
    }

    if (options.lowercase === true) {
        modelName = modelName.toLowerCase();
    }

    if (options.capitalize === true) {
        modelName = capitalize(modelName);
    }

    if (options.capitalizeWords === true) {
        modelName = w(modelName).map(capitalize).join(' ');
    }

    return modelName;
});
