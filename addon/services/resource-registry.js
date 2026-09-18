import Service from '@ember/service';
import { getOwner } from '@ember/application';
import {
    registerResourceDescriptor,
    registerResourceDescriptors,
    setResourceOpener,
    getResourceDescriptors,
    getResourceDescriptor,
    resolveResourceKey,
    resourceComponentName,
    canOpenResource,
    openResource,
    relationValue,
    safeIdentifier,
    unwrapResource,
} from '../utils/resource-registry';

/**
 * A service front for the resource registry util, so an engine can register
 * its descriptors and open resources through `owner.lookup('service:resource-registry')`
 * without importing ember-ui modules.
 */
export default class ResourceRegistryService extends Service {
    get owner() {
        return getOwner(this);
    }

    get descriptors() {
        return getResourceDescriptors(this.owner);
    }

    register(descriptor) {
        return registerResourceDescriptor(this.owner, descriptor);
    }

    registerDescriptors(descriptors) {
        return registerResourceDescriptors(this.owner, descriptors);
    }

    setOpener(key, open, options = {}) {
        return setResourceOpener(this.owner, key, open, options);
    }

    resolveKey(input) {
        return resolveResourceKey(this.owner, input);
    }

    getDescriptor(input) {
        return getResourceDescriptor(this.owner, input);
    }

    componentName(kind, input) {
        return resourceComponentName(this.owner, kind, input);
    }

    canOpen(input) {
        return canOpenResource(this.owner, input);
    }

    open(input, options = {}) {
        return openResource(this.owner, input, options);
    }

    relationValue(record, name) {
        return relationValue(record, name);
    }

    safeIdentifier(value) {
        return safeIdentifier(value);
    }

    unwrap(input) {
        return unwrapResource(input);
    }
}
