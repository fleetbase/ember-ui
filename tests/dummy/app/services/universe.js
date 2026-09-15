import { inject as service } from '@ember/service';
import StubEventedService from '../utils/stub-evented-service';

/**
 * Stub of the host console's `universe` extension registry service.
 * Menu-item arrays are empty; registry lookups return empty arrays; `on`/`off`/`trigger` work.
 */
export default class UniverseService extends StubEventedService {
    @service('universe/menu-service') menuService;
    @service('universe/widget-service') widgetService;
    @service('universe/registry-service') registryService;
    @service('universe/extension-manager') extensionManager;

    calls = [];

    headerMenuItems = [];
    organizationMenuItems = [];
    userMenuItems = [];

    registerDashboard(dashboardId) {
        this.calls.push({ method: 'registerDashboard', args: [dashboardId] });
    }

    getMenuItemsFromRegistry(registryName) {
        this.calls.push({ method: 'getMenuItemsFromRegistry', args: [registryName] });
        return [];
    }

    getRenderableComponentsFromRegistry(registryName) {
        this.calls.push({ method: 'getRenderableComponentsFromRegistry', args: [registryName] });
        return [];
    }
}
