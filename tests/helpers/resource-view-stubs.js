import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

/**
 * A stand-in for ember-core's `universe/resource-view-service`, which the
 * ember-core release this addon tests against may not have yet.
 *
 * It keeps the contract the layout components rely on — `mergeSlot` and
 * `mergeRowActions` — and appends registered items without placement logic
 * (that is ember-core's to test). Every call is recorded so a test can check
 * which registry and slot a view merged, and with what context.
 */
export class ResourceViewStub extends Service {
    @tracked items = {};
    calls = [];

    add(name, ...items) {
        this.items = { ...this.items, [name]: [...(this.items[name] ?? []), ...items] };
    }

    mergeSlot(prefix, slot, base, context) {
        this.calls.push({ prefix, slot, context });
        return [...(base ?? []), ...(this.items[`${prefix}:${slot}`] ?? [])];
    }

    mergeRowActions(prefix, columns, context) {
        this.calls.push({ prefix, slot: 'row-actions', context });
        const extra = this.items[`${prefix}:row-actions`];
        if (!extra) {
            return columns;
        }

        return columns.map((column) => (column.cellComponent === 'table/cell/dropdown' ? { ...column, actions: [...(column.actions ?? []), ...extra] } : column));
    }
}

/**
 * Register the stub and return it.
 */
export function setupResourceView(owner) {
    owner.register('service:universe/resource-view-service', ResourceViewStub);
    return owner.lookup('service:universe/resource-view-service');
}

/**
 * Serve components from a fake, already-loaded extension engine, so an
 * `ExtensionComponent`-shaped definition resolves through `lazy-engine-component`.
 *
 * @param {Object} owner
 * @param {Object} components `{ 'cell/score': ComponentClass }`
 */
export function setupExtensionEngine(owner, components = {}) {
    const registry = Object.fromEntries(Object.entries(components).map(([path, cls]) => [`component:${path}`, cls]));
    const engine = {
        hasRegistration: (key) => key in registry,
        register: (key, value) => (registry[key] = value),
        factoryFor: (key) => (registry[key] ? { class: registry[key] } : undefined),
    };

    owner.register(
        'service:universe/extension-manager',
        class extends Service {
            getEngineInstance() {
                return engine;
            }

            ensureEngineLoaded() {
                return Promise.resolve(engine);
            }
        }
    );
}
