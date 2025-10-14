import Helper from '@ember/component/helper';
import { inject as service } from '@ember/service';
import { evaluatePermission } from '../utils/permission-check';

/**
 * Usage:
 *   {{can-write this.model}}                      // infers create|update via isNew
 *   {{can-write this.model schema="telematics"}}
 *   {{can-write "integrated-vendor" subject=this.model}}
 */
export default class CanWriteHelper extends Helper {
    @service abilities;

    compute([modelOrResource], named = {}) {
        const { schema = 'fleet-ops', resource, subject, defaultWhenUnknown = false } = named;
        const args = typeof modelOrResource === 'string' ? { resource: modelOrResource, model: subject } : { model: modelOrResource };

        return evaluatePermission({
            abilitiesService: this.abilities,
            schema,
            kind: 'write',
            resource: resource ?? args.resource,
            model: args.model ?? subject,
            defaultWhenUnknown,
        });
    }
}
