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
        return getWithDefault(
            {
                'application/vnd.ms-excel': 'xls',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xls',
                'vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xls',
                'vnd.ms-excel': 'xls',
                'text/csv': 'csv',
                'text/tsv': 'tsv',
                xlsx: 'xls',
                xls: 'xls',
                xlsb: 'xls',
                xlsm: 'xls',
                docx: 'doc',
                docm: 'doc',
            },
            getWithDefault(file, 'extension', 'xls'),
            'xls'
        );
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
