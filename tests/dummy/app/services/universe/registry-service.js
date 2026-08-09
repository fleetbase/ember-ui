import Service from '@ember/service';

/**
 * Stub of the host console's `universe/registry-service`.
 * `getRenderableComponents` returns an empty array (prime `renderableComponents` to override).
 */
export default class UniverseRegistryService extends Service {
    calls = [];

    /** Map of registryName -> renderable components array. */
    renderableComponents = {};

    getRenderableComponents(registryName) {
        this.calls.push({ method: 'getRenderableComponents', args: [registryName] });
        return this.renderableComponents[registryName] ?? [];
    }
}
