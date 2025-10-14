import Helper from '@ember/component/helper';
import { inject as service } from '@ember/service';
import { evaluatePermission } from '../utils/permission-check';

export default class CannotDeleteHelper extends Helper {
    @service abilities;

    compute([modelOrResource], named = {}) {
        const { schema = 'fleet-ops', resource, subject, defaultWhenUnknown = false } = named;
        const args = typeof modelOrResource === 'string' ? { resource: modelOrResource, model: subject } : { model: modelOrResource };

        const allowed = evaluatePermission({
            abilitiesService: this.abilities,
            schema,
            kind: 'delete',
            resource: resource ?? args.resource,
            model: args.model ?? subject,
            defaultWhenUnknown,
        });

        return !allowed;
    }
}
