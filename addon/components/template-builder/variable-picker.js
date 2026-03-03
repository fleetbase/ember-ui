import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

/**
 * TemplateBuilderVariablePickerComponent
 *
 * A modal/panel for browsing available variables from the context schema
 * and inserting them — or a formula using the [{...}] syntax — into the
 * currently targeted element property.
 *
 * The component is split into two tabs:
 *   1. Variables — browse the context schema tree and click to insert
 *   2. Formula   — compose a formula expression with variable autocomplete
 *
 * @argument {Array}    contextSchemas - Array of context schema objects from the API
 *                                       Each schema: { namespace, label, icon, variables: [{path, label, type, example}] }
 * @argument {Boolean}  isOpen         - Whether the picker is visible
 * @argument {Function} onInsert       - Called with the final string to insert (e.g. '{invoice.total}' or '[{ {a} + {b} }]')
 * @argument {Function} onClose        - Called when the picker should be dismissed
 */
export default class TemplateBuilderVariablePickerComponent extends Component {
    @tracked activeTab = 'variables';
    @tracked searchQuery = '';
    @tracked expandedNamespaces = new Set();
    @tracked formulaExpression = '';
    @tracked formulaError = null;

    // -------------------------------------------------------------------------
    // Computed
    // -------------------------------------------------------------------------

    get contextSchemas() {
        return this.args.contextSchemas ?? [];
    }

    get filteredSchemas() {
        const q = this.searchQuery.toLowerCase().trim();
        if (!q) return this.contextSchemas;

        return this.contextSchemas
            .map((schema) => ({
                ...schema,
                variables: (schema.variables ?? []).filter(
                    (v) =>
                        v.path.toLowerCase().includes(q) ||
                        (v.label ?? '').toLowerCase().includes(q)
                ),
            }))
            .filter((schema) => schema.variables.length > 0);
    }

    get hasResults() {
        return this.filteredSchemas.some((s) => s.variables.length > 0);
    }

    get formulaPreview() {
        if (!this.formulaExpression.trim()) return '';
        return `[{ ${this.formulaExpression.trim()} }]`;
    }

    @action
    isExpanded(namespace) {
        return this.expandedNamespaces.has(namespace);
    }

    // -------------------------------------------------------------------------
    // Actions
    // -------------------------------------------------------------------------

    @action
    switchTab(tab) {
        this.activeTab = tab;
    }

    @action
    updateSearch(event) {
        this.searchQuery = event.target.value;
        // Auto-expand all namespaces when searching
        if (this.searchQuery) {
            this.expandedNamespaces = new Set(this.contextSchemas.map((s) => s.namespace));
        }
    }

    @action
    toggleNamespace(namespace) {
        const next = new Set(this.expandedNamespaces);
        if (next.has(namespace)) {
            next.delete(namespace);
        } else {
            next.add(namespace);
        }
        this.expandedNamespaces = next;
    }

    @action
    insertVariable(variable) {
        const token = `{${variable.path}}`;
        if (this.args.onInsert) {
            this.args.onInsert(token);
        }
        this.close();
    }

    @action
    insertVariableIntoFormula(variable) {
        this.formulaExpression = `${this.formulaExpression}{${variable.path}}`;
    }

    @action
    updateFormula(event) {
        this.formulaExpression = event.target.value;
        this.formulaError = null;
    }

    @action
    insertFormula() {
        if (!this.formulaExpression.trim()) return;

        // Basic client-side validation: check balanced braces
        const expr = this.formulaExpression;
        const openBraces = (expr.match(/\{/g) ?? []).length;
        const closeBraces = (expr.match(/\}/g) ?? []).length;
        if (openBraces !== closeBraces) {
            this.formulaError = 'Unbalanced curly braces in formula.';
            return;
        }

        const token = `[{ ${expr.trim()} }]`;
        if (this.args.onInsert) {
            this.args.onInsert(token);
        }
        this.close();
    }

    @action
    close() {
        this.searchQuery = '';
        this.formulaExpression = '';
        this.formulaError = null;
        this.activeTab = 'variables';
        if (this.args.onClose) {
            this.args.onClose();
        }
    }

    // -------------------------------------------------------------------------
    // Global variable shortcuts
    // -------------------------------------------------------------------------

    get globalVariables() {
        return [
            { path: 'company.name',    label: 'Company Name',    type: 'string',  example: 'Acme Logistics' },
            { path: 'company.email',   label: 'Company Email',   type: 'string',  example: 'hello@acme.com' },
            { path: 'company.phone',   label: 'Company Phone',   type: 'string',  example: '+1 555 0100' },
            { path: 'company.address', label: 'Company Address', type: 'string',  example: '123 Main St' },
            { path: 'company.logo',    label: 'Company Logo URL',type: 'url',     example: 'https://...' },
            { path: 'user.name',       label: 'Current User',    type: 'string',  example: 'John Doe' },
            { path: 'user.email',      label: 'User Email',      type: 'string',  example: 'john@acme.com' },
            { path: 'now',             label: 'Current DateTime',type: 'datetime',example: '2025-03-03 14:00' },
            { path: 'today',           label: 'Today\'s Date',   type: 'date',    example: '2025-03-03' },
            { path: 'year',            label: 'Current Year',    type: 'number',  example: '2025' },
        ];
    }

    get typeIcon() {
        return (type) => {
            const map = {
                string:   'font',
                number:   'hashtag',
                date:     'calendar',
                datetime: 'clock',
                url:      'link',
                boolean:  'toggle-on',
                array:    'list',
                object:   'cube',
            };
            return map[type] ?? 'circle-dot';
        };
    }
}
