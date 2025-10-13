import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { isArray } from '@ember/array';
import { dasherize, underscore } from '@ember/string';
import { debug } from '@ember/debug';
import { task } from 'ember-concurrency';
import getModelName from '@fleetbase/ember-core/utils/get-model-name';

const defaultAcceptedFileTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/pdf',
    'application/x-pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-flv',
    'video/x-ms-wmv',
    'audio/mpeg',
    'video/x-msvideo',
    'application/zip',
    'application/x-tar',
];

export default class ModelMultiFileUploadComponent extends Component {
    @service fetch;
    @tracked uploadQueue = [];
    @tracked failedStates = ['queued', 'failed', 'timed_out', 'aborted'];
    @tracked type;
    @tracked subject;
    @tracked path;
    @tracked acceptedFileTypes = defaultAcceptedFileTypes;

    constructor(owner, { subject, type, path, acceptedFileTypes }) {
        super(...arguments);
        this.subject = subject;
        this.type = type;
        this.path = path;
        this.acceptedFileTypes = acceptedFileTypes ? this.#parseAcceptedFileTypes(acceptedFileTypes) : defaultAcceptedFileTypes;
    }

    #parseAcceptedFileTypes(acceptedFileTypes) {
        if (isArray(acceptedFileTypes)) {
            return acceptedFileTypes;
        }

        if (typeof acceptedFileTypes === 'string') {
            return acceptedFileTypes.split(',');
        }

        return [];
    }

    @task *queueFile(file) {
        if (this.#hasFileUploadFailed(file)) return;

        try {
            this.uploadQueue.pushObject(file);

            yield this.fetch.uploadFile.perform(
                file,
                {
                    path: this.#constructPath(),
                    type: underscore(this.type),
                    ...this.#getSubjectProperties(),
                    ...(this.args.uploadParams ?? {}),
                },
                (uploadedFile) => {
                    if (typeof this.args.onUploaded === 'function') {
                        this.args.onUploaded(uploadedFile);
                    }
                    this.#removeQueuedFile(file);
                },
                () => {
                    this.#removeQueuedFile(file);
                }
            );
        } catch (err) {
            debug('Unable to upload file: ' + err.message);
        }
    }

    @task *removeFile(file) {
        try {
            yield file.destroyRecord();
        } catch (err) {
            debug('Unable to delete file: ' + err.message);
        }
    }

    #getSubjectProperties() {
        const properties = {};
        if (this.subject && !this.subject.get('isNew')) {
            properties.subject_uuid = this.subject.id;
            properties.subject_type = getModelName(this.subject);
        }

        return properties;
    }

    #constructPath() {
        return this.path ? this.path : `uploads/${dasherize(this.type)}`;
    }

    #hasFileUploadFailed(file) {
        return ['queued', 'failed', 'timed_out', 'aborted'].indexOf(file.state) === -1;
    }

    #removeQueuedFile(file) {
        this.uploadQueue.removeObject(file);
        if (file.queue && typeof file.queue.remove === 'function') {
            file.queue.remove(file);
        }
    }
}
