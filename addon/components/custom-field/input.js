import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { underscore } from '@ember/string';
import { debug } from '@ember/debug';
import { UploadFile, FileSource, DEFAULT_QUEUE } from 'ember-file-upload';
import isModel from '@fleetbase/ember-core/utils/is-model';
import getModelName from '@fleetbase/ember-core/utils/get-model-name';
import getCustomFieldTypeMap from '../../utils/get-custom-field-type-map';
import fetchFileAsDataUrl from '../../utils/fetch-file-as-data-url';
import findCustomFieldValue from '../../utils/find-custom-field-value';
import fileSentinelId from '../../utils/file-sentinel-id';

export default class CustomFieldInputComponent extends Component {
    @service fetch;
    @service fileQueue;
    @service store;
    /* istanbul ignore next -- the constructor assigns this before anything reads it */
    @tracked extension = 'fleet-ops';
    @tracked customField;
    /* istanbul ignore next -- the constructor assigns this before anything reads it */
    @tracked customFieldComponent;
    @tracked value;
    @tracked file;
    @tracked uploadedFile;
    @tracked signatureDataUrl;
    @tracked isUploadingSignature = false;

    /**
     * The file record a stored signature was hydrated from. It belongs to the saved value, so
     * clearing or re-signing must not destroy it before the resource itself is saved.
     */
    storedFile = null;

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
        this.signatureDataUrl = this.#getSignatureUrlFromValue(this.value);

        // A signature stored on the subject is already uploaded: show its saved state and
        // download control, as after an upload in this session, and draw it onto the pad.
        if (this.customFieldComponent === 'signature-pad') {
            this.storedFile = this.#getStoredFileFromValue(this.value) ?? null;
            this.uploadedFile = this.storedFile ?? undefined;

            if (this.storedFile?.id) {
                this.#hydrateStoredSignature(this.storedFile);
            }
        }
    }

    /**
     * Draws a stored signature onto the pad. The file's own URL cannot be used: it points at
     * object storage, which does not answer CORS for the console, so the canvas image load
     * fails and the pad stays blank. The bytes come through the API instead, as a data URL.
     * If that fails the pad stays empty, and the saved status still offers the download.
     * @param {Object} file
     */
    async #hydrateStoredSignature(file) {
        try {
            const dataUrl = await fetchFileAsDataUrl(this.fetch, file.id);

            if (!this.isDestroying && !this.isDestroyed) {
                this.signatureDataUrl = dataUrl;
            }
        } catch (error) {
            debug(`Unable to load the stored signature for custom field ${this.customField?.id}: ${error.message}`);
        }
    }

    @action downloadFile() {
        const file = this.uploadedFile;
        return this.fetch.download('files/download', { file: file.id }, { fileName: file.original_filename ?? file.filename, mimeType: file.content_type });
    }

    @action removeFile() {
        // Only a file uploaded in this session is ours to destroy; a stored one is still
        // referenced by the saved value until the resource is saved without it.
        if (isModel(this.uploadedFile) && this.uploadedFile !== this.storedFile) {
            this.uploadedFile.destroyRecord();
        }

        this.uploadedFile = undefined;
        this.value = undefined;
        this.signatureDataUrl = null;

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
        return this.fetch.uploadFile.perform(
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

    /**
     * Tracks the ink on the `<SignaturePad>` as the user signs. Nothing is uploaded from
     * here: a signature is several strokes, so the upload waits for the pad's Done button
     * (`onSignatureDone`). Clearing the pad removes an already uploaded signature.
     *
     * @param {string|null} dataUrl
     * @action
     */
    @action onSignatureChange(dataUrl) {
        this.signatureDataUrl = dataUrl;

        if (!dataUrl) {
            this.removeFile();
        }
    }

    /**
     * The user pressed Done on the pad: upload the finished signature.
     *
     * @param {string} dataUrl
     * @action
     */
    @action onSignatureDone(dataUrl) {
        return this.uploadSignature(dataUrl);
    }

    /**
     * Converts a signature data URL into an uploadable file and pushes it through the
     * same upload flow the file-upload field type uses, so the stored value is the
     * familiar `file:<uuid>` sentinel.
     *
     * @param {string} dataUrl
     */
    async uploadSignature(dataUrl) {
        /* istanbul ignore if -- only the pad's Done button reaches this, and it is gone once the
           field is destroyed; while an upload runs the pad is rendered disabled
           (input.hbs: @disabled={{this.isUploadingSignature}}), which disables that button, so
           the upload cannot re-enter */
        if (this.isDestroying || this.isDestroyed || this.isUploadingSignature) {
            return;
        }

        this.isUploadingSignature = true;

        const previousFile = this.uploadedFile;
        const file = UploadFile.fromDataURL(dataUrl, FileSource.DataUrl);

        // `fromDataURL` names the underlying file "blob", and leaves it detached from
        // any queue. Both matter: the filename ends up on the file record, and the
        // upload task's error path calls `queue.remove(file)` unguarded.
        file.name = `signature-${this.customField.name ?? this.customField.id}.png`;
        this.fileQueue.findOrCreate(DEFAULT_QUEUE).add(file);

        try {
            await this.onFileAddedHandler(file);

            if (isModel(previousFile) && previousFile !== this.uploadedFile && previousFile !== this.storedFile) {
                previousFile.destroyRecord();
            }
        } finally {
            if (!this.isDestroying && !this.isDestroyed) {
                this.isUploadingSignature = false;
            }
        }
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

    /**
     * The file record behind a stored file-backed value: the server expands the `file:` sentinel
     * into the file's json. A raw data url or an unexpanded sentinel has no record yet.
     * @param {string|Object|null} value
     * @returns {Object|undefined}
     */
    #getStoredFileFromValue(value) {
        if (!value) {
            return undefined;
        }

        // A `file:<uuid>` reference not yet expanded (the value record was edited in this
        // session): the id is all the hydration and the download need.
        const fileId = fileSentinelId(value);
        if (fileId) {
            return { id: fileId };
        }

        let json = value;
        if (typeof value === 'string') {
            if (!value.startsWith('{')) {
                return undefined;
            }

            try {
                json = JSON.parse(value);
            } catch {
                return undefined;
            }
        }

        return this.store.push(this.store.normalize('file', json));
    }

    /**
     * Only a signature still held as a raw data url is drawn straight onto the pad; a stored
     * file is fetched through the API by #hydrateStoredSignature.
     * @param {*} value
     * @returns {string|null}
     */
    #getSignatureUrlFromValue(value) {
        return typeof value === 'string' && value.startsWith('data:') ? value : null;
    }

    #getValueFromSubject(customField, subject) {
        return findCustomFieldValue(subject, customField)?.value ?? null;
    }
}
