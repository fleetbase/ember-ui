import Helper from '@ember/component/helper';
import { getOwner } from '@ember/application';
import { resourceComponentName } from '../utils/resource-registry';

/**
 * `{{resource-component "pill" x}}` — the name of the pill, summary,
 * identity or select-option component registered for a resource, or `null`
 * when the resource is unknown or the component cannot be rendered here.
 * Pair it with `{{#if}}` so the caller can fall back to plain text.
 */
export default class ResourceComponentHelper extends Helper {
    compute([kind, input]) {
        return resourceComponentName(getOwner(this), kind, input);
    }
}
