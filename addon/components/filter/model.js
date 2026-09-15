import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { getOwner } from '@ember/application';
import { resourceComponentName } from '../../utils/resource-registry';

export default class FilterModelComponent extends Component {
    @tracked selectedModel;

    constructor() {
        super(...arguments);
        this.selectedModel = this.args.value;
    }

    get optionLabel() {
        return this.args.filter?.modelNamePath ?? 'name';
    }

    /**
     * The component that renders each option and the selected item: the
     * column's own `filterOptionComponent`, else the select-option registered
     * for the filtered model, else nothing (the label path is shown as text).
     */
    get optionComponent() {
        const { filter } = this.args;

        if (filter?.filterOptionComponent) {
            return filter.filterOptionComponent;
        }

        return resourceComponentName(getOwner(this), 'select-option', filter?.model);
    }

    @action onChange(selectedModel) {
        const { onChange, filter } = this.args;

        this.selectedModel = selectedModel;

        // The select's own clear control selects null; report that as a clear
        // so the filter is removed rather than set to an empty value.
        if (!selectedModel) {
            return this.clear();
        }

        if (typeof onChange === 'function') {
            onChange(filter, selectedModel.id);
        }
    }

    @action clear() {
        const { onClear, filter } = this.args;

        this.selectedModel = null;

        if (typeof onClear === 'function') {
            onClear(filter);
        }
    }
}
