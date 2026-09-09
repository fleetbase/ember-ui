import Service from '@ember/service';

/**
 * Stub of the host console's `universe/extension-manager` service. `ensureEngineLoaded`
 * resolves a deterministic fake engine instance (Map-backed `register`/`hasRegistration`/
 * `factoryFor`) so lazy-engine-component and load-engine settle without a real engine.
 */
export default class UniverseExtensionManagerService extends Service {
    calls = [];

    _engines = new Map();

    _createFakeEngineInstance(engineName) {
        const registrations = new Map();

        return {
            engineName,
            hasRegistration: (key) => registrations.has(key),
            register: (key, factory) => {
                registrations.set(key, factory);
            },
            factoryFor: (key) => (registrations.has(key) ? { class: registrations.get(key) } : null),
            lookup: () => null,
        };
    }

    getEngineInstance(engineName) {
        this.calls.push({ method: 'getEngineInstance', args: [engineName] });
        return this._engines.get(engineName) ?? null;
    }

    ensureEngineLoaded(engineName) {
        this.calls.push({ method: 'ensureEngineLoaded', args: [engineName] });
        if (!this._engines.has(engineName)) {
            this._engines.set(engineName, this._createFakeEngineInstance(engineName));
        }

        return Promise.resolve(this._engines.get(engineName));
    }
}
