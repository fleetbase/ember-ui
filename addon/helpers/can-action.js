import Helper from '@ember/component/helper';
import { inject as service } from '@ember/service';
import { evaluatePermission } from '../utils/permission-check';

/**
 * Usage:
 *   {{can-action "approve" this.model schema="fleet-ops"}}
 *   {{can-action "archive" resource="integrated-vendor" subject=this.model}}
 */
export default class CanActionHelper extends Helper {
    @service abilities;

    compute([action, modelOrResource], named = {}) {
        const { schema = 'fleet-ops', resource, subject, defaultWhenUnknown = false } = named;
        const args = typeof modelOrResource === 'string' ? { resource: modelOrResource, model: subject } : { model: modelOrResource };

        return evaluatePermission({
            abilitiesService: this.abilities,
            schema,
            kind: 'custom',
            action,
            resource: resource ?? args.resource,
            model: args.model ?? subject,
            defaultWhenUnknown,
        });
    }
}
