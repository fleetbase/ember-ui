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

    constructor(owner, { customField, subject }) {
        super(...arguments);
        this.customField = customField;
        this.value = this.#getValueFromSubject(customField, subject);
        this.subject = subject;
    }

    #getValueFromSubject(customField, subject) {
        const cfValue = (subject.get('custom_field_values') ?? []).find((cfv) => cfv.custom_field_uuid === customField.id);
        let value = cfValue?.value ?? null;
        // If custom field is file upload normalize value to image
        if (value && customField?.type === 'file-upload') {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            const normalized = this.store.normalize('file', parsed);
            value = this.store.push(normalized);
        }
        return value;
    }

    @action downloadFile() {
        const file = this.value;
        return this.fetch.download('files/download', { file: file.id }, { fileName: file.filename, mimeType: file.content_type });
    }
}
