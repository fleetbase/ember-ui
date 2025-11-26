import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { getOwner } from '@ember/application';

/**
 * Lazy Engine Component
 * 
 * Wrapper component that lazy-loads components from engines on-demand
 * Handles loading states and errors gracefully
 * 
 * Usage:
 * <LazyEngineComponent @componentDef={{widget.component}} @args={{hash ...}} />
 * 
 * @class LazyEngineComponentComponent
 * @extends Component
 */
export default class LazyEngineComponentComponent extends Component {
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
     * @returns {Promise<void>}
     */
    async loadComponent() {
        const { componentDef } = this.args;

        // If it's a string, it's already a local component
        if (typeof componentDef === 'string') {
            this.resolvedComponent = componentDef;
            this.isLoading = false;
            return;
        }

        // If it's an ExtensionComponent definition
        if (componentDef && typeof componentDef === 'object') {
            const { engine, path } = componentDef;

            if (engine && path) {
                try {
                    // Trigger lazy loading of the engine
                    const engineInstance = await this.extensionManager.ensureEngineLoaded(engine);

                    if (engineInstance) {
                        // Component is now available via Ember's resolver
                        // Format: engine-name@component-path
                        const engineName = engine.replace('@fleetbase/', '').replace('-engine', '');
                        const componentPath = path.replace('components/', '');
                        this.resolvedComponent = `${engineName}@${componentPath}`;
                    } else {
                        this.error = `Engine ${engine} could not be loaded`;
                    }
                } catch (error) {
                    console.error('[LazyEngineComponent] Error loading component:', error);
                    this.error = error.message || 'Failed to load component';
                } finally {
                    this.isLoading = false;
                }
                return;
            }

            // If it has a component property, recurse
            if (componentDef.component) {
                this.args.componentDef = componentDef.component;
                await this.loadComponent();
                return;
            }
        }

        // If we get here, we couldn't resolve the component
        this.error = 'Invalid component definition';
        this.isLoading = false;
    }
}
