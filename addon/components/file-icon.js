import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';

export default class FileIconComponent extends Component {
    @tracked file;
    @tracked extension;
    @tracked icon;

    constructor(owner, { file }) {
        super(...arguments);

        this.file = file;
        this.extension = this.getExtension(file);
        this.icon = this.getIcon(file);
    }

    getExtension(file) {
        if (!file || (!file.original_filename && !file.url && !file.path)) {
            return null;
        }

        // Prefer to use the original filename if available, then URL, then path
        const filename = file.original_filename || file.url || file.path;
        const extensionMatch = filename.match(/\.(.+)$/);
        return extensionMatch ? extensionMatch[1] : null;
    }

    getIcon(file) {
        const extension = this.getExtension(file);

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
            extension,
            'file-alt'
        );
    }
}
