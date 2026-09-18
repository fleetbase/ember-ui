import Service from '@ember/service';
import { A } from '@ember/array';

/**
 * Stub of the host console's `universe/registry-service`, with the section /
 * list / key storage the addon relies on. The real service lives in
 * ember-core and needs the console's extension loader to boot.
 */
export default class UniverseRegistryService extends Service {
    calls = [];
    registries = new Map();

    /** Map of registryName -> renderable components array. */
    renderableComponents = {};

    getOrCreateList(sectionName, listName) {
        if (!this.registries.has(sectionName)) {
            this.registries.set(sectionName, {});
        }

        const section = this.registries.get(sectionName);

        if (!section[listName]) {
            section[listName] = A([]);
        }

        return section[listName];
    }

    register(sectionName, listName, key, value) {
        this.calls.push({ method: 'register', args: [sectionName, listName, key] });

        const list = this.getOrCreateList(sectionName, listName);

        if (typeof value === 'object' && value !== null) {
            value._registryKey = key;
        }

        const existing = list.find((item) => item && item._registryKey === key);

        if (existing) {
            list.replace(list.indexOf(existing), 1, [value]);
        } else {
            list.pushObject(value);
        }
    }

    getRegistry(sectionName, listName) {
        const section = this.registries.get(sectionName);

        return section?.[listName] ?? A([]);
    }

    lookup(sectionName, listName, key) {
        return this.getRegistry(sectionName, listName).find((item) => item && item._registryKey === key) ?? null;
    }

    createRegistry(sectionName, type = 'menu-item') {
        return this.getOrCreateList(sectionName, type);
    }

    getRenderableComponents(registryName) {
        this.calls.push({ method: 'getRenderableComponents', args: [registryName] });
        return this.renderableComponents[registryName] ?? [];
    }
}
