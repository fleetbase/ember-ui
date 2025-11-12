import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { underscore } from '@ember/string';
import isObject from '@fleetbase/ember-core/utils/is-object';
import isModel from '@fleetbase/ember-core/utils/is-model';
import getModelName from '@fleetbase/ember-core/utils/get-model-name';
import getCustomFieldTypeMap from '../../utils/get-custom-field-type-map';

export default class CustomFieldInputComponent extends Component {
    @service fetch;
    @tracked extension = 'fleet-ops';
    @tracked customField;
    @tracked customFieldComponent;
    @tracked value;
    @tracked file;
    @tracked uploadedFile;

    get acceptedFileTypes() {
        return [
            // Excel
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel.sheet.macroenabled.12',
            // Word / PowerPoint
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/msword',
            // PDF
            'application/pdf',
            'application/x-pdf',
            // Images
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            // Video
            'video/mp4',
            'video/quicktime',
            'video/x-msvideo',
            'video/x-flv',
            'video/x-ms-wmv',
            // Audio
            'audio/mpeg',
            // Archives
            'application/zip',
            'application/x-tar',
            // Json
            'application/json',
            'text/json',
            'application/x-json',
            // Text documents
            'text/plain',
            'text/markdown',
            'application/rtf',
            'text/csv',
            'text/tab-separated-values',
            'text/html',
            'application/xml',
            'text/xml',
            'application/x-yaml',
            'text/yaml',
        ];
    }

    /**
     * A map defining the available custom field types and their corresponding components.
     */
    customFieldTypeMap = getCustomFieldTypeMap();

    constructor(owner, { customField, subject, extension = 'fleet-ops' }) {
        super(...arguments);
        this.customField = customField;
        this.value = this.#getValueFromSubject(customField, subject);
        this.subject = subject;
        this.extension = extension;
        this.customFieldComponent = typeof customField.component === 'string' ? customField.component : 'input';
    }

    @action removeFile() {
        if (isModel(this.uploadedFile)) {
            this.uploadedFile.destroyRecord();
        }

        this.uploadedFile = undefined;
        this.value = undefined;

        if (typeof this.args.onChange === 'function') {
            this.args.onChange(undefined, this.customField);
        }
    }

    @action async onFileAddedHandler(file) {
        // since we have dropzone and upload button within dropzone validate the file state first
        // as this method can be called twice from both functions
        if (['queued', 'failed', 'timed_out', 'aborted'].indexOf(file.state) === -1) return;

        // set file for progress state
        this.file = file;

        // resolve subject if necessary
        const subject = await this.subject;

        let path = `uploads/${this.extension ?? 'cf-files'}/${this.customField.id}`;
        let type = `custom_field_file`;

        if (subject) {
            path = `uploads/${this.extension ?? 'cf-files'}/${getModelName(subject)}-cf-files`;
            type = `${underscore(getModelName(subject))}_file`;
        }

        // Queue and upload immediatley
        this.fetch.uploadFile.perform(
            file,
            {
                path,
                type,
            },
            (uploadedFile) => {
                this.file = undefined;
                this.value = `file:${uploadedFile.id}`;
                this.uploadedFile = uploadedFile;
                if (typeof this.args.onChange === 'function') {
                    this.args.onChange(this.value, this.customField);
                }
            },
            () => {
                // remove file from queue
                if (file.queue && typeof file.queue.remove === 'function') {
                    file.queue.remove(file);
                }
                this.file = undefined;
            }
        );
    }

    @action onChangeHandler(event, otherValue) {
        const isRawInput = typeof event === 'string' || typeof event === 'number';
        const isMoneyInput = this.customFieldComponent === 'money-input' && isObject(event);
        const isEventInput = event instanceof window.Event;
        const isDateTimeInput = this.customFieldComponent === 'date-time-input' && typeof otherValue === 'string';
        const isDatePicker = this.customFieldComponent === 'date-picker' && typeof otherValue === 'string';

        if (isDateTimeInput || isDatePicker) {
            const value = otherValue;
            this.value = value;

            if (typeof this.args.onChange === 'function') {
                this.args.onChange(value, this.customField);
            }
            return;
        }

        if (isRawInput) {
            this.value = event;

            if (typeof this.args.onChange === 'function') {
                this.args.onChange(event, this.customField);
            }
            return;
        }

        if (isMoneyInput) {
            const value = event.newValue;
            if (typeof this.args.onChange === 'function') {
                this.args.onChange(value, this.customField);
            }
            return;
        }

        if (isEventInput) {
            const value = event.target.value;
            this.value = value;

            if (typeof this.args.onChange === 'function') {
                this.args.onChange(value, this.customField);
            }
            return;
        }
    }

    #getValueFromSubject(customField, subject) {
        const cfValue = (subject.get('custom_field_values') ?? []).find((cfv) => cfv.custom_field_uuid === customField.id);
        if (cfValue) return cfValue.value;
        return null;
    }
}
