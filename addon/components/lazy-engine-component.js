import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { assert } from '@ember/debug';
import { task } from 'ember-concurrency'

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

    constructor() {
        super(...arguments);
        this.loadComponent.perform();
    }

    /**
     * Load the component from the engine
     * 
     * @method loadComponent
     * @private
     */
    @task *loadComponent() {
        const { component: componentDef } = this.args;

        // Handle backward compatibility: if componentDef is already a class, use it directly
        if (typeof componentDef === 'function') {
            this.resolvedComponent = componentDef;
            return;
        }

        console.log('[componentDef]', componentDef);

        // Handle lazy component definitions
        if (componentDef && componentDef.engine && componentDef.path) {
            try {
                const { engine: engineName, path: componentPath } = componentDef;

                assert(
                    `LazyEngineComponent requires an engine name in componentDef`,
                    engineName
                );

                assert(
                    `LazyEngineComponent requires a component path in componentDef`,
                    componentPath
                );

                // This is the key step that triggers lazy loading
                const engineInstance = yield this.extensionManager.ensureEngineLoaded(engineName);
                if (!engineInstance) {
                    throw new Error(`Failed to load engine '${engineName}'`);
                }

                console.log('[engineInstance]', engineInstance);

                // Clean the path and lookup the component
                const cleanPath = componentPath.replace(/^components\//, '');
                const component = engineInstance.lookup(`component:${cleanPath}`);

                console.log('[component]', component);

                if (!component) {
                    throw new Error(
                        `Component '${cleanPath}' not found in engine '${engineName}'. ` +
                        `Make sure the component exists and is properly registered.`
                    );
                }

                this.resolvedComponent = component;
            } catch (e) {
                console.error('LazyEngineComponent: Error loading component:', e);
                this.error = e.message;
            } 
        } else {
            // Invalid component definition
            this.error = 'Invalid component definition. Expected an object with engine and path properties.';
        }
    }

    /**
     * Get all arguments to pass to the resolved component
     * Excludes the componentDef argument
     * 
     * @computed componentArgs
     * @returns {Object} Arguments to pass to component
     */
    get componentArgs() {
        const { componentDef, ...rest } = this.args;
        return rest;
    }
}
