import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { assert } from '@ember/debug';
import { task } from 'ember-concurrency';
import { ExtensionComponent } from '@fleetbase/ember-core/contracts';

/**
 * LazyEngineComponent
 *
 * A wrapper component that handles lazy loading of components from engines.
 * This component takes an ExtensionComponent definition and:
 * 1. Triggers lazy loading of the engine if not already loaded
 * 2. Looks up the component from the loaded engine
 * 3. Renders the component with all passed arguments
 *
 * This enables cross-engine component usage while preserving lazy loading.
 *
 * @class LazyEngineComponent
 * @extends Component
 *
 * @example
 * <LazyEngineComponent
 *   @componentDef={{this.menuItem.component}}
 *   @model={{@model}}
 *   @onChange={{@onChange}}
 * />
 */
export default class LazyEngineComponent extends Component {
    @service('universe/extension-manager') extensionManager;
    @tracked resolvedComponent = null;
    @tracked component = this.args.component;
    @tracked params = this.args.params ?? {};
    @tracked error = null;

    constructor() {
        super(...arguments);
        this.loadComponent.perform();
    }

    @action handleChange(el, [component, params = {}]) {
        this.component = component;
        this.params = params;
        this.loadComponent.perform();
    }

    /**
     * Load the component from the engine
     *
     * @method loadComponent
     * @private
     */
    @task *loadComponent() {
        let componentDef = this.component;

        // Handle string form component definition
        if (typeof componentDef === 'string' && componentDef.startsWith('#extension-component')) {
            /* eslint-disable no-unused-vars */
            const [_, engineName, componentPathOrName] = componentDef.split(':');
            componentDef = new ExtensionComponent(engineName, componentPathOrName);
        }

        // Handle backward compatibility: if componentDef is already a class or string, use it directly
        if (typeof componentDef === 'function' || typeof componentDef === 'string') {
            this.resolvedComponent = componentDef;
            return;
        }

        // Handle ExtensionComponent definitions
        if (componentDef && componentDef.engine) {
            try {
                const { engine: engineName, path: componentPath, class: componentClass, isClass } = componentDef;

                assert(`LazyEngineComponent requires an engine name in componentDef`, engineName);

                // Ensure engine is loaded
                const engineInstance = yield this.extensionManager.ensureEngineLoaded(engineName);
                if (!engineInstance) {
                    throw new Error(`Failed to load engine '${engineName}'`);
                }

                // Handle component class (immediate)
                if (isClass && componentClass) {
                    // Register component class to engine if not already registered
                    const dasherized = componentClass.name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
                    const componentKey = `component:${dasherized}`;

                    if (!engineInstance.hasRegistration(componentKey)) {
                        engineInstance.register(componentKey, componentClass);
                        // Also register with original name
                        engineInstance.register(`component:${componentClass.name}`, componentClass);
                    }

                    this.resolvedComponent = componentClass;
                    return;
                }

                // Handle component path (lazy)
                if (componentPath) {
                    // Clean the path and lookup the component
                    const cleanPath = componentPath.replace(/^components\//, '');

                    // First, check if the component is registered in the engine
                    const componentKey = `component:${cleanPath}`;
                    if (!engineInstance.hasRegistration(componentKey)) {
                        throw new Error(`Component '${cleanPath}' is not registered in engine '${engineName}'. ` + `Make sure the component exists and is properly exported.`);
                    }

                    // Lookup the component factory (not the instance)
                    const componentFactory = engineInstance.factoryFor(componentKey);
                    if (!componentFactory) {
                        throw new Error(`Component factory for '${cleanPath}' not found in engine '${engineName}'. ` + `The component may be registered but not properly defined.`);
                    }

                    // Get the component class from the factory
                    const resolvedClass = componentFactory.class;
                    if (!resolvedClass) {
                        throw new Error(`Component class for '${cleanPath}' is undefined in engine '${engineName}'.`);
                    }

                    this.resolvedComponent = resolvedClass;
                    return;
                }

                throw new Error('ExtensionComponent requires either a path or class');
            } catch (e) {
                console.error('LazyEngineComponent: Error loading component:', e);
                this.error = e.message;
            }
        } else {
            // Invalid component definition
            this.error = 'Invalid component definition. Expected an ExtensionComponent with engine and path/class properties.';
        }
    }
}
