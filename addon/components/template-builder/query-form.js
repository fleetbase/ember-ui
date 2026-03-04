import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

/**
 * TemplateBuilderQueryFormComponent
 *
 * Modal dialog for creating or editing a TemplateQuery.
 * This component is purely presentational — it validates the form and returns
 * the data to the parent via @onSave. No API calls are made here; the parent
 * (template-builder) persists everything in one go when the template is saved.
 *
 * Form state is split into individual @tracked fields plus separate @tracked
 * arrays for conditions and sort. This prevents the {{#each}} loops from
 * destroying and recreating input DOM elements on every keystroke (which would
 * steal focus from the active input).
 *
 * @argument {Boolean}  isOpen         - Whether the modal is visible
 * @argument {Object}   query          - Existing query to edit (null for create)
 * @argument {Array}    resourceTypes  - Optional override for the resource type list
 * @argument {Function} onSave         - Called with the validated query data object
 * @argument {Function} onClose        - Called when the modal should close
 */
export default class TemplateBuilderQueryFormComponent extends Component {
    @service('template-builder') templateBuilderService;

    // ── Scalar form fields ──────────────────────────────────────────────────
    @tracked label = '';
    @tracked variableName = '';
    @tracked description = '';
    @tracked modelType = '';
    @tracked limit = '';
    @tracked withRelations = [];

    // ── Array fields — kept as separate tracked properties so that mutating
    //   a single item does NOT cause the entire form to re-render and destroy
    //   focused input elements. ────────────────────────────────────────────
    @tracked conditions = [];
    @tracked sort = [];

    @tracked errorMessage = null;

    /**
     * Track whether the user has manually edited the variable_name field.
     * While false, variable_name is auto-derived from label on every keystroke.
     */
    @tracked _variableNameManuallyEdited = false;

    // -------------------------------------------------------------------------
    // Lifecycle — sync form state when @query or @isOpen changes
    // -------------------------------------------------------------------------

    get isEditing() {
        return !!this.args.query?.uuid;
    }

    // Glimmer re-evaluates this getter whenever @query or @isOpen changes,
    // giving us a hook to reset the form without needing did-update modifiers.
    get _syncKey() {
        const key = `${this.args.isOpen}-${this.args.query?.uuid ?? 'new'}`;
        this._syncForm();
        return key;
    }

    _syncForm() {
        const q = this.args.query;
        if (q) {
            this.label = q.label ?? '';
            this.variableName = q.variable_name ?? '';
            this.description = q.description ?? '';
            this.modelType = q.model_type ?? '';
            this.limit = q.limit ?? '';
            this.withRelations = Array.isArray(q.with) ? [...q.with] : [];
            this.conditions = JSON.parse(JSON.stringify(q.conditions ?? []));
            this.sort = JSON.parse(JSON.stringify(q.sort ?? []));
            this._variableNameManuallyEdited = !!q.variable_name?.trim();
        } else {
            this.label = '';
            this.variableName = '';
            this.description = '';
            this.modelType = '';
            this.limit = '';
            this.withRelations = [];
            this.conditions = [];
            this.sort = [];
            this._variableNameManuallyEdited = false;
        }
        this.errorMessage = null;
    }

    // -------------------------------------------------------------------------
    // Resource types
    // Priority: @resourceTypes arg > service-registered types > built-in defaults
    // -------------------------------------------------------------------------

    get resourceTypes() {
        if (this.args.resourceTypes?.length) {
            return this.args.resourceTypes;
        }
        const serviceTypes = this.templateBuilderService?.resourceTypes ?? [];
        if (serviceTypes.length) {
            return serviceTypes;
        }
        return [
            { value: 'Fleetbase\\FleetOps\\Models\\Order', label: 'Order', icon: 'box' },
            { value: 'Fleetbase\\FleetOps\\Models\\Driver', label: 'Driver', icon: 'id-card' },
            { value: 'Fleetbase\\FleetOps\\Models\\Place', label: 'Place', icon: 'location-dot' },
            { value: 'Fleetbase\\FleetOps\\Models\\Vendor', label: 'Vendor', icon: 'building' },
            { value: 'Fleetbase\\FleetOps\\Models\\Contact', label: 'Contact', icon: 'address-book' },
            { value: 'Fleetbase\\FleetOps\\Models\\Issue', label: 'Issue', icon: 'triangle-exclamation' },
            { value: 'Fleetbase\\FleetOps\\Models\\Vehicle', label: 'Vehicle', icon: 'truck' },
            { value: 'Fleetbase\\FleetOps\\Models\\FuelReport', label: 'Fuel Report', icon: 'gas-pump' },
            { value: 'Fleetbase\\FleetOps\\Models\\PurchaseRate', label: 'Purchase Rate', icon: 'receipt' },
        ];
    }

    // -------------------------------------------------------------------------
    // Condition operators
    // -------------------------------------------------------------------------

    get conditionOperators() {
        return [
            { value: '=', label: '= equals' },
            { value: '!=', label: '≠ not equals' },
            { value: '>', label: '> greater than' },
            { value: '>=', label: '≥ greater or equal' },
            { value: '<', label: '< less than' },
            { value: '<=', label: '≤ less or equal' },
            { value: 'like', label: '~ contains' },
            { value: 'not like', label: '!~ not contains' },
            { value: 'in', label: 'in list' },
            { value: 'not in', label: 'not in list' },
            { value: 'null', label: 'is null' },
            { value: 'not null', label: 'is not null' },
        ];
    }

    // -------------------------------------------------------------------------
    // Eager-load (with) — stored as array, edited as comma string
    // -------------------------------------------------------------------------

    get withString() {
        return (this.withRelations ?? []).join(', ');
    }

    @action
    updateWith(event) {
        const raw = event.target.value;
        this.withRelations = raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }

    // -------------------------------------------------------------------------
    // Scalar field updates
    // -------------------------------------------------------------------------

    @action
    updateLabel(event) {
        const value = event.target.value;
        this.label = value;
        if (!this._variableNameManuallyEdited) {
            this.variableName = this._deriveVariableName(value);
        }
    }

    @action
    updateVariableName(event) {
        this._variableNameManuallyEdited = true;
        this.variableName = event.target.value;
    }

    @action
    updateDescription(event) {
        this.description = event.target.value;
    }

    @action
    updateLimit(event) {
        const raw = event.target.value;
        this.limit = raw === '' ? '' : parseInt(raw, 10);
    }

    @action
    selectResourceType(value) {
        this.modelType = value;
    }

    // -------------------------------------------------------------------------
    // Conditions — mutate in-place then bump the array reference so Glimmer
    // re-evaluates the {{#each}} without destroying existing DOM nodes.
    // -------------------------------------------------------------------------

    @action
    addCondition() {
        this.conditions = [...this.conditions, { field: '', operator: '=', value: '' }];
    }

    @action
    updateConditionField(index, field, event) {
        const value = event.target.value;
        // Mutate the specific item in-place — the DOM node for this input stays
        // alive and keeps focus. Then bump the array reference so Glimmer knows
        // the list changed (needed for the operator select and value visibility).
        const item = this.conditions[index];
        if (item) {
            Object.assign(item, { [field]: value });
            this.conditions = [...this.conditions];
        }
    }

    @action
    removeCondition(index) {
        this.conditions = this.conditions.filter((_, i) => i !== index);
    }

    // -------------------------------------------------------------------------
    // Sort — same in-place mutation pattern as conditions
    // -------------------------------------------------------------------------

    @action
    addSort() {
        this.sort = [...this.sort, { field: '', direction: 'asc' }];
    }

    @action
    updateSortField(index, field, event) {
        const value = event.target.value;
        const item = this.sort[index];
        if (item) {
            Object.assign(item, { [field]: value });
            this.sort = [...this.sort];
        }
    }

    @action
    removeSort(index) {
        this.sort = this.sort.filter((_, i) => i !== index);
    }

    // -------------------------------------------------------------------------
    // Save / Cancel
    // -------------------------------------------------------------------------

    @action
    save() {
        this.errorMessage = null;

        if (!this.label?.trim()) {
            this.errorMessage = 'Label is required.';
            return;
        }
        if (!this.modelType) {
            this.errorMessage = 'Please select a resource type.';
            return;
        }

        const data = {
            uuid: this.args.query?.uuid ?? null,
            label: this.label.trim(),
            variable_name: this.variableName.trim() || this._deriveVariableName(this.label),
            description: this.description?.trim() ?? '',
            model_type: this.modelType,
            conditions: this.conditions.filter((c) => c.field?.trim()),
            sort: this.sort.filter((s) => s.field?.trim()),
            limit: this.limit === '' ? null : this.limit,
            with: this.withRelations,
        };

        if (this.args.onSave) {
            this.args.onSave(data);
        }
    }

    @action
    cancel() {
        this.errorMessage = null;
        if (this.args.onClose) {
            this.args.onClose();
        }
    }

    // -------------------------------------------------------------------------
    // Private
    // -------------------------------------------------------------------------

    _deriveVariableName(label) {
        return (label ?? '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }
}
