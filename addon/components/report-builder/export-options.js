import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class ReportBuilderExportOptionsComponent extends Component {
    @tracked format = 'csv';

    @tracked exportOptions = [
        { value: 'csv', label: 'CSV' },
        { value: 'xlsx', label: 'Excel (XLSX)' },
        { value: 'json', label: 'JSON' },
    ];

    @action setFormat(val) {
        this.format = val;
    }

    @action export() {
        if (!this.args.disabled) this.args.onExport?.(this.format.value);
    }
}
