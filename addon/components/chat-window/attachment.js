import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';

export default class ChatWindowAttachmentComponent extends Component {
    @tracked chatAttachment;
    @tracked icon;

    constructor(owner, { record }) {
        super(...arguments);
        this.chatAttachment = record;
        this.icon = this.getIcon(record);
    }

    @action download() {
        return this.chatAttachment.download();
    }

    getExtension(chatAttachment) {
        const filename = chatAttachment.filename;
        const extensionMatch = filename.match(/\.(.+)$/);
        return extensionMatch ? extensionMatch[1] : null;
    }

    getIcon(chatAttachment) {
        this.extension = this.getExtension(chatAttachment);

        // A filename with no dot (README, Dockerfile, LICENSE) has no extension, and
        // getWithDefault asserts on a null key rather than falling back — so the component threw
        // during render. file-icon.js guards the identical case the same way.
        if (!this.extension) {
            return 'file-alt';
        }

        return getWithDefault(
            {
                xlsx: 'file-excel',
                xls: 'file-excel',
                xlsb: 'file-excel',
                xlsm: 'file-excel',
                csv: 'file-spreadsheet',
                tsv: 'file-spreadsheet',
                docx: 'file-word',
                docm: 'file-word',
                pdf: 'file-pdf',
                ppt: 'file-powerpoint',
                pptx: 'file-powerpoint',
            },
            this.extension,
            'file-alt'
        );
    }
}
