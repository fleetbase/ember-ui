import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

/**
 * TemplateBuilderQueriesPanelComponent
 *
 * Lists all TemplateQuery records for the current template and provides
 * add / edit / delete actions. Each query defines a named dataset that
 * is injected into the template context at render time under the query's
 * variable_name token (e.g. `{recent_orders}`).
 *
 * @argument {String}   templateUuid  - UUID of the template being edited
 * @argument {Function} onQueriesChange - Called with the updated queries array whenever it changes
 */
export default class TemplateBuilderQueriesPanelComponent extends Component {
    @service fetch;
    @service notifications;

    @tracked queries    = [];
    @tracked isLoading  = false;
    @tracked formOpen   = false;
    @tracked editingQuery = null;

    constructor(owner, args) {
        super(owner, args);
        this.loadQueries();
    }

    // -------------------------------------------------------------------------
    // Data loading
    // -------------------------------------------------------------------------

    @action
    async loadQueries() {
        const uuid = this.args.templateUuid;
        if (!uuid) return;

        this.isLoading = true;
        try {
            const result = await this.fetch.get('template-queries', { template_uuid: uuid });
            this.queries = Array.isArray(result) ? result : (result?.template_queries ?? []);
            this._notifyChange();
        } catch (err) {
            this.notifications.serverError(err);
        } finally {
            this.isLoading = false;
        }
    }

    // -------------------------------------------------------------------------
    // Form open/close
    // -------------------------------------------------------------------------

    @action
    openCreateForm() {
        this.editingQuery = null;
        this.formOpen     = true;
    }

    @action
    openEditForm(query) {
        this.editingQuery = query;
        this.formOpen     = true;
    }

    @action
    closeForm() {
        this.formOpen     = false;
        this.editingQuery = null;
    }

    // -------------------------------------------------------------------------
    // CRUD
    // -------------------------------------------------------------------------

    @action
    handleQuerySaved(savedQuery) {
        const existing = this.queries.find((q) => q.uuid === savedQuery.uuid);
        if (existing) {
            // Replace the updated query in the list
            this.queries = this.queries.map((q) => (q.uuid === savedQuery.uuid ? savedQuery : q));
        } else {
            this.queries = [...this.queries, savedQuery];
        }
        this._notifyChange();
        this.closeForm();
    }

    @action
    async deleteQuery(query) {
        try {
            await this.fetch.delete(`template-queries/${query.uuid}`);
            this.queries = this.queries.filter((q) => q.uuid !== query.uuid);
            this._notifyChange();
        } catch (err) {
            this.notifications.serverError(err);
        }
    }

    // -------------------------------------------------------------------------
    // Private
    // -------------------------------------------------------------------------

    _notifyChange() {
        if (this.args.onQueriesChange) {
            this.args.onQueriesChange(this.queries);
        }
    }
}
