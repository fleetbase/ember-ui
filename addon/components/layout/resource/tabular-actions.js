import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { getOwner } from '@ember/application';
import lookupResourceView, { mergeHeaderButtons } from '../../../utils/resource-view';

export default class LayoutResourceTabularActionsComponent extends Component {
    @service filters;

    get resourceView() {
        return lookupResourceView(getOwner(this));
    }

    /**
     * What registered handlers receive as their context. This component only
     * renders the header, so registered columns and row actions are merged by
     * the caller that renders the table (`ResourceActionService.mergeRegisteredColumns`).
     */
    get viewContext() {
        const { args } = this;
        return {
            controller: args.controller,
            get table() {
                return args.table;
            },
            getSelectedRows: () => args.table?.selectedRows ?? [],
        };
    }

    get actionButtons() {
        return mergeHeaderButtons(this.resourceView, this.args.registry, this.args.actionButtons, this.viewContext);
    }

    get bulkActions() {
        const { resourceView } = this;
        const { registry, bulkActions } = this.args;
        return resourceView && registry ? resourceView.mergeSlot(registry, 'bulk-actions', bulkActions, this.viewContext) : bulkActions;
    }

    /**
     * The column picker toggles `hidden` on the column objects themselves;
     * the list is handed back only to a caller that asked for it, never
     * assigned onto `@columns`, which is often a controller getter.
     */
    @action setColumns(columns) {
        if (typeof this.args.onColumnsChange === 'function') {
            this.args.onColumnsChange(columns);
        }
    }
}
