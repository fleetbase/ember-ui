import Service from '@ember/service';

/**
 * Stub of the host console's `customFieldsRegistry` service. `loadSubjectCustomFields` is a
 * pseudo task resolving an empty manager (`{ groups: [], customFields: [] }`); `forSubject`
 * returns null (no cached manager); `panel.edit`/`panel.create` are recorded no-ops.
 */
export default class CustomFieldsRegistryService extends Service {
    calls = [];

    panel = {
        edit: (customField) => {
            this.calls.push({ method: 'panel.edit', args: [customField] });
        },
        create: (...args) => {
            this.calls.push({ method: 'panel.create', args });
        },
    };

    loadSubjectCustomFields = {
        isRunning: false,
        isIdle: true,
        perform: (subjectOwner, options = {}) => {
            this.calls.push({ method: 'loadSubjectCustomFields.perform', args: [subjectOwner, options] });
            return Promise.resolve({ groups: [], customFields: [] });
        },
    };

    forSubject(subjectOwner, options = {}) {
        this.calls.push({ method: 'forSubject', args: [subjectOwner, options] });
        return null;
    }
}
