import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class CustomFieldValueComponent extends Component {
    @service store;
    @service fetch;
    @tracked customField;
    @tracked value;
    @tracked subject;

    get isBoolean() {
        return this.customField?.type === 'boolean';
    }

    get isFile() {
        return this.customField?.type === 'file-upload';
    }

    get isSignature() {
        return this.customField?.type === 'signature-pad';
    }

    get signatureUrl() {
        const value = this.value;

        if (!value) {
            return null;
        }

        if (typeof value === 'string') {
            return value.startsWith('data:') ? value : null;
        }

        return value.url ?? null;
    }

    constructor(owner, { customField, subject }) {
        super(...arguments);
        this.customField = customField;
        this.value = this.#getValueFromSubject(customField, subject);
        this.subject = subject;
    }

    #getValueFromSubject(customField, subject) {
        const cfValue = (subject.get('custom_field_values') ?? []).find((cfv) => cfv.custom_field_uuid === customField.id);
        let value = cfValue?.value ?? null;

        // File backed field types store the server expanded file json, normalize it to a file model
        if (value && ['file-upload', 'signature-pad'].includes(customField?.type)) {
            value = this.#normalizeFileValue(value);
        }

        return value;
    }

    #normalizeFileValue(value) {
        if (typeof value !== 'string') {
            return this.store.push(this.store.normalize('file', value));
        }

        // A signature captured before its upload landed is still a raw data url
        if (value.startsWith('data:')) {
            return value;
        }

        // An unexpanded sentinel — the server cast normally resolves this into file json
        if (value.startsWith('file:')) {
            return null;
        }

        try {
            return this.store.push(this.store.normalize('file', JSON.parse(value)));
        } catch {
            return null;
        }
    }

    @action downloadFile() {
        const file = this.value;
        return this.fetch.download('files/download', { file: file.id }, { fileName: file.filename, mimeType: file.content_type });
    }
}
