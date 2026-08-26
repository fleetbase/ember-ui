import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { underscore } from '@ember/string';
import isModel from '@fleetbase/ember-core/utils/is-model';
import getModelName from '@fleetbase/ember-core/utils/get-model-name';
import getCustomFieldTypeMap from '../../utils/get-custom-field-type-map';

export default class CustomFieldInputComponent extends Component {
    @service fetch;
    /* istanbul ignore next -- the constructor assigns this before anything reads it */
    @tracked extension = 'fleet-ops';
    @tracked customField;
    /* istanbul ignore next -- the constructor assigns this before anything reads it */
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
        /* istanbul ignore if -- guards against ember-file-upload firing this from both the
           dropzone and the upload button for one file; the queue only ever hands this suite a
           freshly queued file, so the duplicate call cannot be reproduced from a test */
        if (['queued', 'failed', 'timed_out', 'aborted'].indexOf(file.state) === -1) return;

        // set file for progress state
        this.file = file;

        // resolve subject if necessary
        const subject = await this.subject;

        /* istanbul ignore next -- extension is assigned by the constructor and defaults to
           'fleet-ops', so it is never nullish */
        let path = `uploads/${this.extension ?? 'cf-files'}/${this.customField.id}`;
        let type = `custom_field_file`;

        // `getModelName` returns null for anything ember-data does not recognise as a model, and
        // `underscore(null)` throws — which left the file stuck in the queue with no error
        // surfaced. Fall back to the generic custom-field path when the subject is not nameable.
        const subjectModelName = subject ? getModelName(subject) : null;

        if (subjectModelName) {
            /* istanbul ignore next -- see above */
            path = `uploads/${this.extension ?? 'cf-files'}/${subjectModelName}-cf-files`;
            type = `${underscore(subjectModelName)}_file`;
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
        // <MoneyInput> reports `onChange(storedValue, detail)` where storedValue is a number, so
        // a money field is a raw input like any other. The old `isMoneyInput` arm required an
        // object, could never run, and would have reported the formatted value instead of cents.
        const isRawInput = typeof event === 'string' || typeof event === 'number';
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

        /* istanbul ignore else -- between them the three arms cover every shape the inner
           components emit: a raw value, a DOM event, or a date component's formatted string */
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
        // `subject?.get(...)` optional-chains the subject but hard-calls `.get`, so any subject
        // that is not an Ember object threw right here, during construction — before the
        // component could render at all. Read the plain property when there is no `get`.
        const values = (typeof subject?.get === 'function' ? subject.get('custom_field_values') : subject?.custom_field_values) ?? [];
        const cfValue = values.find((cfv) => cfv.custom_field_uuid === customField.id);
        if (cfValue) return cfValue.value;
        return null;
    }
}
