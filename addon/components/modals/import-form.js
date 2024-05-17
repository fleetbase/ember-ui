import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency-decorators';
import { tracked } from '@glimmer/tracking';

export default class ModalsImportFormComponent extends Component {
    @service fetch;
    @service store;
    @tracked uploadQueue = [];
    @tracked isMultipleDropoffOrder = false;
    @tracked pendingAttachmentFile;
    @tracked pendingAttachmentFiles = [];

    constructor() {
        super(...arguments);
    }

    acceptedFileTypes = [
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

    @action handleFileChange(event) {
        const file = event.target.files[0];
        if (file) {
            this.uploadFile(file);
        }
    }

    @task *uploadFile(file) {
        if (['queued', 'failed', 'timed_out', 'aborted'].indexOf(file.state) === -1) {
            return;
        }

        this.pendingAttachmentFile = file;

        yield this.fetch.uploadFile.perform(
            file,
            {
                path: `uploads/fleet-ops/driver-imports/${this.currentUser.companyId}`,
                type: `driver_import`,
            },
            (uploadedFile) => {
                this.pendingAttachmentFiles.pushObject(uploadedFile);
                this.pendingAttachmentFile = undefined;
            },
            () => {
                // remove file from queue
                if (file.queue && typeof file.queue.remove === 'function') {
                    file.queue.remove(file);
                }
                this.pendingAttachmentFile = undefined;
            }
        );
    }
}
