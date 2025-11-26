import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

/**
 * RegistryYield Component
 * 
 * Yields items from a registry (menu items or components)
 * Updated to work with the refactored universe service architecture
 * 
 * @class RegistryYieldComponent
 * @extends Component
 */
export default class RegistryYieldComponent extends Component {
    @service universe;
    @service('universe/menu-service') menuService;
    @service('universe/registry-service') registryService;
    @tracked yieldables = [];

    constructor() {
        super(...arguments);
        this.yieldables = this.getYieldables();
        
        // Listen for registry changes
        this.universe.on('menuItem.registered', () => {
            this.yieldables = this.getYieldables();
        });
        this.universe.on('component.registered', () => {
            this.yieldables = this.getYieldables();
        });
    }

    /**
     * Get yieldable items from the registry
     * 
     * @method getYieldables
     * @returns {Array} Array of items to yield
     */
    getYieldables() {
        const { type, registry } = this.args;

        // Handle menu items
        if (['buttons', 'menu', 'menuItems'].includes(type)) {
            return this.getMenuItems(registry);
        }

        // Handle components
        return this.getComponents(registry);
    }

    /**
     * Get menu items from registry
     * 
     * @method getMenuItems
     * @param {String} registry Registry name
     * @returns {Array} Array of menu items
     */
    getMenuItems(registry) {
        // Try new MenuService first
        if (this.menuService) {
            const items = this.menuService.getMenuItems(registry);
            if (items && items.length > 0) {
                return items;
            }
        }

        // Fallback to universe (backward compatibility)
        if (typeof this.universe.getMenuItemsFromRegistry === 'function') {
            return this.universe.getMenuItemsFromRegistry(registry) ?? [];
        }

        return [];
    }

    /**
     * Get components from registry
     * 
     * @method getComponents
     * @param {String} registry Registry name
     * @returns {Array} Array of component definitions
     */
    getComponents(registry) {
        // Try new RegistryService first
        if (this.registryService) {
            const components = this.registryService.lookup(registry);
            if (components) {
                // If it's a single component, wrap in array
                return Array.isArray(components) ? components : [components];
            }
        }

        // Fallback to universe (backward compatibility)
        if (typeof this.universe.getRenderableComponentsFromRegistry === 'function') {
            return this.universe.getRenderableComponentsFromRegistry(registry) ?? [];
        }

        return [];
    }
}
