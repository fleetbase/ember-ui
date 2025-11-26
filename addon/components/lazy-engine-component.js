import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { assert } from '@ember/debug';

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
    @tracked isLoading = true;
    @tracked error = null;

    constructor() {
        super(...arguments);
        this.loadComponent();
    }

    /**
     * Load the component from the engine
     * 
     * @method loadComponent
     * @private
     */
    async loadComponent() {
        const { componentDef } = this.args;

        // Handle backward compatibility: if componentDef is already a class, use it directly
        if (typeof componentDef === 'function') {
            this.resolvedComponent = componentDef;
            this.isLoading = false;
            return;
        }

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
                const engineInstance = await this.extensionManager.ensureEngineLoaded(engineName);

                if (!engineInstance) {
                    throw new Error(`Failed to load engine '${engineName}'`);
                }

                // Clean the path and lookup the component
                const cleanPath = componentPath.replace(/^components\//, '');
                const component = engineInstance.lookup(`component:${cleanPath}`);

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
            } finally {
                this.isLoading = false;
            }
        } else {
            // Invalid component definition
            this.error = 'Invalid component definition. Expected an object with engine and path properties.';
            this.isLoading = false;
        }
    }

    /**
     * Get the loading component name
     * 
     * @computed loadingComponentName
     * @returns {String} Loading component name
     */
    get loadingComponentName() {
        const { componentDef } = this.args;
        return componentDef?.loadingComponent || 'loading-spinner';
    }

    /**
     * Get the error component name
     * 
     * @computed errorComponentName
     * @returns {String} Error component name
     */
    get errorComponentName() {
        const { componentDef } = this.args;
        return componentDef?.errorComponent || 'error-display';
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
