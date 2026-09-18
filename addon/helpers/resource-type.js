import Helper from '@ember/component/helper';
import { getOwner } from '@ember/application';
import { resolveResourceKey } from '../utils/resource-registry';

/**
 * `{{resource-type x}}` — the registered resource key for a record, stub,
 * model name, alias or polymorphic type string; `null` when unknown.
 */
export default class ResourceTypeHelper extends Helper {
    compute([input]) {
        return resolveResourceKey(getOwner(this), input);
    }
}
