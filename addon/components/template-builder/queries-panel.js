import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

/**
 * TemplateBuilderQueriesPanelComponent
 *
 * Lists the TemplateQuery records for the current template and provides
 * add / edit / delete operations. All mutations are propagated upward via
 * @onQueriesChange — no API calls are made here. The parent (template-builder)
 * includes the full queries array in the template save payload, so everything
 * persists in one request when the user clicks Save.
 *
 * @argument {Array}    queries          - Current list of query objects (from parent state)
 * @argument {Function} onQueriesChange  - Called with the updated queries array after any mutation
 */
export default class TemplateBuilderQueriesPanelComponent extends Component {
    @tracked isFormOpen = false;
    @tracked editingQuery = null;

    // -------------------------------------------------------------------------
    // Computed
    // -------------------------------------------------------------------------

    get queries() {
        return this.args.queries ?? [];
    }

    // -------------------------------------------------------------------------
    // Form open/close
    // -------------------------------------------------------------------------

    @action
    openAddForm() {
        this.editingQuery = null;
        this.isFormOpen = true;
    }

    @action
    openEditForm(query) {
        this.editingQuery = query;
        this.isFormOpen = true;
    }

    @action
    closeForm() {
        this.isFormOpen = false;
        this.editingQuery = null;
    }

    // -------------------------------------------------------------------------
    // CRUD — all mutations notify the parent via @onQueriesChange
    // -------------------------------------------------------------------------

    @action
    handleQuerySave(queryData) {
        let updated;

        if (queryData.uuid) {
            // Update existing query in the list
            updated = this.queries.map((q) => (q.uuid === queryData.uuid ? { ...q, ...queryData } : q));
        } else {
            // New query — assign a temporary client-side UUID so it can be
            // identified for edits/deletes before the template is saved.
            const tempUuid = `_new_${Date.now()}`;
            updated = [...this.queries, { ...queryData, uuid: tempUuid }];
        }

        this._notify(updated);
        this.closeForm();
    }

    @action
    deleteQuery(query) {
        const updated = this.queries.filter((q) => q.uuid !== query.uuid);
        this._notify(updated);
    }

    // -------------------------------------------------------------------------
    // Private
    // -------------------------------------------------------------------------

    _notify(queries) {
        if (this.args.onQueriesChange) {
            this.args.onQueriesChange(queries);
        }
    }
}
