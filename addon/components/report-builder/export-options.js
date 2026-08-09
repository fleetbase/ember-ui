import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class ReportBuilderExportOptionsComponent extends Component {
    @tracked exportOptions = [
        { value: 'csv', label: 'CSV' },
        { value: 'xlsx', label: 'Excel (XLSX)' },
        { value: 'json', label: 'JSON' },
    ];

    // PowerSelect is given whole option objects and renders `{{option.label}}`, so the default
    // has to be the OPTION, not the bare string 'csv' — a string selection renders a blank
    // trigger and `format.value` is undefined until the picker is touched.
    @tracked format = this.exportOptions[0];

    @action setFormat(val) {
        this.format = val;
    }

    @action export() {
        if (!this.args.disabled) this.args.onExport?.(this.format.value);
    }
}
