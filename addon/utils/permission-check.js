import { dasherize } from '@ember/string';

/**
 * Resolve a resource name from args or model.
 * @param {object} opts
 * @param {string} [opts.resource]         - explicit resource override
 * @param {any}    [opts.model]            - Ember Data record or POJO
 * @returns {string|null}
 */
export function resolveResource({ resource, model }) {
    if (resource && typeof resource === 'string') {
        return dasherize(resource);
    }

    // Ember Data v3/v4+
    const nameFromCtor = model?.constructor?.modelName;
    if (nameFromCtor) return dasherize(nameFromCtor);

    // VERY old fallback (avoid if possible)
    const legacy = model?.get('_internalModel.modelName');
    if (legacy) return dasherize(legacy);

    return null;
}

/**
 * Normalize action (e.g., for "write" helpers decide create vs update).
 * @param {object} opts
 * @param {string} [opts.explicit] - explicit action override
 * @param {string} [opts.kind]     - 'write'|'delete'|'custom'
 * @param {any}    [opts.model]    - model to determine create/update
 * @returns {string|null}
 */
export function resolveAction({ explicit, kind, model }) {
    if (explicit) return explicit;

    if (kind === 'delete') return 'delete';

    if (kind === 'write') {
        if (model && typeof model.isNew === 'boolean') {
            return model.isNew ? 'create' : 'update';
        }
        return null; // cannot infer
    }

    // custom: explicit is required
    return null;
}

/**
 * Call the `can` service in a tolerant way.
 * Supports: can.can(str, subject), can.cannot(str, subject), or can(str, subject)
 * Returns true if allowed, false otherwise.
 * @param {any} abilitiesService
 * @param {string} permission
 * @param {any} subject
 * @returns {boolean}
 */
export function checkPermission(abilitiesService, permission, subject) {
    if (!abilitiesService || !permission) return false;

    // Patterns we support
    if (typeof abilitiesService.can === 'function') {
        return !!abilitiesService.can(permission, subject);
    }
    if (typeof abilitiesService.cannot === 'function') {
        return !abilitiesService.cannot(permission, subject);
    }
    if (typeof abilitiesService === 'function') {
        return !!abilitiesService(permission, subject);
    }
    return false;
}

/**
 * Core helper logic shared by all helpers.
 * @param {object} opts
 * @param {any}    opts.abilitiesService
 * @param {string} [opts.schema='fleet-ops']
 * @param {string} [opts.action]        - explicit action (e.g., 'approve')
 * @param {string} [opts.kind]          - 'write' | 'delete' | 'custom'
 * @param {string} [opts.resource]      - explicit resource
 * @param {any}    [opts.model]         - subject/model for policy checks
 * @param {boolean}[opts.defaultWhenUnknown=false]
 * @returns {boolean}
 */
export function evaluatePermission({ abilitiesService, schema = 'fleet-ops', action, kind, resource, model, defaultWhenUnknown = false }) {
    const resolvedResource = resolveResource({ resource, model });
    const resolvedAction = resolveAction({ explicit: action, kind, model });

    if (!schema || !resolvedAction || !resolvedResource) {
        return !!defaultWhenUnknown;
    }

    const permission = `${schema} ${resolvedAction} ${resolvedResource}`;
    return checkPermission(abilitiesService, permission, model);
}
