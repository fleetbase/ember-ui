import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';
import isModel from '@fleetbase/ember-core/utils/is-model';
import isUploadFile from '../utils/is-upload-file';

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
        let filename;

        if (isModel(file)) {
            filename = file.original_filename ?? file.url ?? file.path;
        }

        if (isUploadFile(file)) {
            filename = file.file ? file.file.name : null;
        }

        if (typeof filename !== 'string') {
            return null;
        }

        // Match the LAST dot-segment and never cross a path separator, so a CDN url such as
        // https://example.test/uploads/manifest.pdf yields "pdf" rather than the whole tail.
        const extensionMatch = filename.match(/\.([^./\\?#]+)(?:[?#].*)?$/);
        return extensionMatch ? extensionMatch[1] : null;
    }

    getIcon(file) {
        const extension = this.getExtension(file);
        if (!extension) {
            return 'file-alt';
        }

        return getWithDefault(
            {
                xlsx: 'file-excel',
                xls: 'file-excel',
                xlsb: 'file-excel',
                xlsm: 'file-excel',
                csv: 'file-csv',
                tsv: 'file-csv',
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
