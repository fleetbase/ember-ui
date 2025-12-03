import Helper from '@ember/component/helper';
import { inject as service } from '@ember/service';
import { assert } from '@ember/debug';
import { ExtensionComponent } from '@fleetbase/ember-core/contracts';

/**
 * Helper that resolves a lazy-loaded engine component for use with {{component}}
 *
 * This helper takes an ExtensionComponent definition and returns the resolved component class.
 * If the engine is not yet loaded, it triggers loading in the background and returns null initially,
 * then recomputes when the engine is ready.
 *
 * @class LazyEngineComponentHelper
 * @extends Helper
 *
 * @example
 * {{component (lazy-engine-component @componentDef) prop1=value1}}
 *
 * @example
 * {{component (lazy-engine-component "#extension-component:@fleetbase/fleetops-engine:order-panel")}}
 *
 * @example
 * {{#let (lazy-engine-component @menuItem.component) as |Component|}}
 *   {{#if Component}}
 *     <Component @model={{@model}} />
 *   {{/if}}
 * {{/let}}
 */
export default class LazyEngineComponentHelper extends Helper {
    @service('universe/extension-manager') extensionManager;

    compute([componentDef]) {
        // Handle string form component definition
        if (typeof componentDef === 'string' && componentDef.startsWith('#extension-component')) {
            const [_, engineName, componentPathOrName] = componentDef.split(':');
            componentDef = new ExtensionComponent(engineName, componentPathOrName);
        }

        // Handle backward compatibility: if componentDef is already a class or string, use it directly
        if (typeof componentDef === 'function' || typeof componentDef === 'string') {
            return componentDef;
        }

        // Handle ExtensionComponent definitions
        if (componentDef && componentDef.engine) {
            const { engine: engineName, path: componentPath, class: componentClass, isClass } = componentDef;

            assert(`lazy-engine-component helper requires an engine name in componentDef`, engineName);

            // Check if engine is already loaded
            const engineInstance = this.extensionManager.getEngineInstance(engineName);

            if (!engineInstance) {
                // Engine not loaded yet - trigger loading in background
                this.extensionManager.ensureEngineLoaded(engineName).then(() => {
                    // Trigger recompute when engine loads
                    this.recompute();
                });

                // Return null for now - will recompute when engine loads
                return null;
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

                return componentClass;
            }

            // Handle component path (lazy)
            if (componentPath) {
                // Clean the path and lookup the component
                const cleanPath = componentPath.replace(/^components\//, '');
                const componentKey = `component:${cleanPath}`;

                if (!engineInstance.hasRegistration(componentKey)) {
                    console.error(`[lazy-engine-component] Component '${cleanPath}' is not registered in engine '${engineName}'.`);
                    return null;
                }

                // Lookup the component factory
                const componentFactory = engineInstance.factoryFor(componentKey);
                if (!componentFactory) {
                    console.error(`[lazy-engine-component] Component factory for '${cleanPath}' not found in engine '${engineName}'.`);
                    return null;
                }

                // Get the component class from the factory
                const resolvedClass = componentFactory.class;
                if (!resolvedClass) {
                    console.error(`[lazy-engine-component] Component class for '${cleanPath}' is undefined in engine '${engineName}'.`);
                    return null;
                }

                return resolvedClass;
            }

            console.error('[lazy-engine-component] ExtensionComponent requires either a path or class');
            return null;
        }

        // Invalid component definition
        console.error('[lazy-engine-component] Invalid component definition. Expected an ExtensionComponent with engine and path/class properties.');
        return null;
    }
}
