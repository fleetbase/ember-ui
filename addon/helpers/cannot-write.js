import Helper from '@ember/component/helper';
import { inject as service } from '@ember/service';
import { evaluatePermission } from '../utils/permission-check';

export default class CannotWriteHelper extends Helper {
    @service abilities;

    /* istanbul ignore next -- Glimmer always passes both the positional and named arguments to a
       helper, so this parameter default can never be reached from a template. */
    compute([modelOrResource], named = {}) {
        const { schema = 'fleet-ops', resource, subject, defaultWhenUnknown = false } = named;
        const args = typeof modelOrResource === 'string' ? { resource: modelOrResource, model: subject } : { model: modelOrResource };

        const allowed = evaluatePermission({
            abilitiesService: this.abilities,
            schema,
            kind: 'write',
            resource: resource ?? args.resource,
            model: args.model ?? subject,
            defaultWhenUnknown,
        });

        return !allowed;
    }
}
