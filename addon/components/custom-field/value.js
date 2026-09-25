import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { debug } from '@ember/debug';
import findCustomFieldValue from '../../utils/find-custom-field-value';
import fileSentinelId from '../../utils/file-sentinel-id';

const FILE_FIELD_TYPES = ['file-upload', 'signature-pad'];

export default class CustomFieldValueComponent extends Component {
    @service fetch;
    @service store;

    /**
     * File records loaded for `file:<uuid>` values, by uuid.
     * @type {Object}
     */
    @tracked resolvedFiles = {};
    #resolving = new Set();

    #normalizedFor;
    #normalized = null;

    get customField() {
        return this.args.customField;
    }

    get isBoolean() {
        return this.customField?.type === 'boolean';
    }

    get isFile() {
        return this.customField?.type === 'file-upload';
    }

    get isSignature() {
        return this.customField?.type === 'signature-pad';
    }

    /**
     * The stored value, read live from the subject so a save that adds or replaces the record
     * shows up without re-rendering the whole panel. File-backed values are normalized once per
     * raw value, so the same object is handed to the template across renders.
     * @type {*}
     */
    get value() {
        const raw = findCustomFieldValue(this.args.subject, this.customField)?.value ?? null;
        const isFileField = FILE_FIELD_TYPES.includes(this.customField?.type);

        // A `file:<uuid>` reference the server has not expanded for us: the value record was
        // edited in this session and the parent's save response does not overwrite a locally
        // changed attribute, so the reference stays until a reload. Load the file ourselves.
        const fileId = isFileField ? fileSentinelId(raw) : null;
        if (fileId) {
            this.#resolveFile(fileId);
            return this.resolvedFiles[fileId] ?? null;
        }

        if (raw !== this.#normalizedFor) {
            this.#normalizedFor = raw;
            this.#normalized = raw && isFileField ? this.#normalizeFileValue(raw) : raw;
        }

        return this.#normalized;
    }

    #resolveFile(fileId) {
        if (fileId in this.resolvedFiles || this.#resolving.has(fileId)) {
            return;
        }

        this.#resolving.add(fileId);
        this.store
            .findRecord('file', fileId)
            .then((file) => {
                if (!this.isDestroying && !this.isDestroyed) {
                    this.resolvedFiles = { ...this.resolvedFiles, [fileId]: file };
                }
            })
            .catch((error) => debug(`Unable to load file ${fileId} for custom field ${this.customField?.id}: ${error.message}`))
            .finally(() => this.#resolving.delete(fileId));
    }

    /**
     * A signature still held as a raw data url has no file record to download.
     * @type {boolean}
     */
    get canDownloadSignature() {
        return typeof this.value === 'object' && this.value !== null && Boolean(this.value.id);
    }

    get signatureUrl() {
        const value = this.value;

        if (!value) {
            return null;
        }

        if (typeof value === 'string') {
            /* istanbul ignore next -- #normalizeFileValue lets a string through only when it
               starts with 'data:': unparseable json becomes null and a file reference is
               resolved to a record before it gets here, so the else arm cannot be reached */
            return value.startsWith('data:') ? value : null;
        }

        return value.url ?? null;
    }

    /**
     * The server expands a stored `file:` sentinel into the file's json. That json is all the
     * file chip and the download need, so it is used as a plain object rather than pushed into
     * the store from a render.
     * @param {string|Object} value
     * @returns {Object|string|null}
     */
    #normalizeFileValue(value) {
        if (typeof value !== 'string') {
            return this.#asFile(value);
        }

        // A signature captured before its upload landed is still a raw data url
        if (value.startsWith('data:')) {
            return value;
        }

        try {
            return this.#asFile(JSON.parse(value));
        } catch {
            return null;
        }
    }

    #asFile(json) {
        // Files are addressed by uuid everywhere (the store's primary key, the download endpoint).
        return { ...json, id: json.uuid ?? json.id };
    }

    @action downloadFile() {
        const file = this.value;
        return this.fetch.download('files/download', { file: file.id }, { fileName: file.original_filename ?? file.filename, mimeType: file.content_type });
    }
}
