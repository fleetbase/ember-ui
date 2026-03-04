import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

/**
 * TemplateBuildService
 *
 * A singleton service that extensions can inject to register resource types
 * available in the TemplateQuery form. Each extension registers its own
 * resource types (Fleetbase model classes) so the template builder knows
 * what models can be queried at render time.
 *
 * Usage in an extension initializer:
 *
 *   // addon/instance-initializers/register-template-resources.js
 *   export function initialize(appInstance) {
 *       const templateBuilder = appInstance.lookup('service:template-builder');
 *       templateBuilder.registerResourceTypes([
 *           { label: 'Order',   value: 'Fleetbase\\FleetOps\\Models\\Order',   icon: 'route' },
 *           { label: 'Driver',  value: 'Fleetbase\\FleetOps\\Models\\Driver',  icon: 'id-card' },
 *           { label: 'Vehicle', value: 'Fleetbase\\FleetOps\\Models\\Vehicle', icon: 'truck' },
 *       ]);
 *   }
 *   export default { initialize };
 *
 * Each resource type object must have:
 *   - `label`  {string}  Human-readable name shown in the picker grid
 *   - `value`  {string}  Fully-qualified PHP class name sent to the backend
 *   - `icon`   {string}  FontAwesome icon name (without the `fa-` prefix)
 *
 * The TemplateBuilder::QueryForm component reads `resourceTypes` from this
 * service and merges them with any types passed via `@resourceTypes` argument,
 * with the argument taking precedence (override).
 */
export default class TemplateBuildService extends Service {
    /**
     * Registered resource types from all extensions.
     * @type {Array<{label: string, value: string, icon: string}>}
     */
    @tracked _resourceTypes = [];

    /**
     * Register one or more resource types from an extension.
     * Duplicate values (by `value` field) are ignored.
     *
     * @param {Array<{label: string, value: string, icon: string}>} types
     */
    registerResourceTypes(types = []) {
        const existing = new Set(this._resourceTypes.map((t) => t.value));
        const newTypes = types.filter((t) => t.value && !existing.has(t.value));
        if (newTypes.length) {
            this._resourceTypes = [...this._resourceTypes, ...newTypes];
        }
    }

    /**
     * Unregister resource types by value. Useful when an extension is torn down.
     *
     * @param {Array<string>} values
     */
    unregisterResourceTypes(values = []) {
        const toRemove = new Set(values);
        this._resourceTypes = this._resourceTypes.filter((t) => !toRemove.has(t.value));
    }

    /**
     * All currently registered resource types.
     * @returns {Array<{label: string, value: string, icon: string}>}
     */
    get resourceTypes() {
        return this._resourceTypes;
    }
}
