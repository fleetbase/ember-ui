import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class LayoutResourceTabularActionsComponent extends Component {
    @service filters;

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
