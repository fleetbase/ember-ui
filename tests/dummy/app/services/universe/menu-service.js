import StubEventedService from '../../utils/stub-evented-service';

/**
 * Stub of the host console's `universe/menu-service`. `getMenuItems` returns an empty array
 * (prime `menuItems` to override); supports `on`/`off` for `menuItem.registered`.
 */
export default class UniverseMenuService extends StubEventedService {
    calls = [];

    /** Map of registryName -> menu items array. */
    menuItems = {};

    getMenuItems(registryName) {
        this.calls.push({ method: 'getMenuItems', args: [registryName] });
        return this.menuItems[registryName] ?? [];
    }
}
