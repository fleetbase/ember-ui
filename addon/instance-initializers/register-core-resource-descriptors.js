import { registerResourceDescriptors } from '../utils/resource-registry';
import buildCoreResourceDescriptors from '../utils/resource-descriptors/core';

/**
 * Registers the descriptors for the console's core resources in the host
 * application, so pills, summaries, identity cells and select options for
 * users, companies, groups, roles, files and categories work everywhere.
 */
export function initialize(appInstance) {
    try {
        registerResourceDescriptors(appInstance, buildCoreResourceDescriptors(appInstance));
    } catch {
        // A host without the registry service simply keeps plain text.
    }
}

export default {
    name: 'register-core-resource-descriptors',
    initialize,
};
