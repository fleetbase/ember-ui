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
 * Resource types are sourced from (in priority order):
 *   1. @resourceTypes argument — allows the consumer to override completely
 *   2. service:template-builder — extensions register types via the service
 *
 * @argument {Boolean}  isOpen         - Whether the modal is visible
 * @argument {Object}   query          - Existing query to edit (null for create)
 * @argument {Array}    resourceTypes  - Optional override for the resource type list
 * @argument {Function} onSave         - Called with the validated query data object
 * @argument {Function} onClose        - Called when the modal should close
 */
export default class TemplateBuilderQueryFormComponent extends Component {
    @service('template-builder') templateBuilderService;

    @tracked form = this._blankForm();
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
            this.form = {
                label: q.label ?? '',
                variable_name: q.variable_name ?? '',
                description: q.description ?? '',
                model_type: q.model_type ?? '',
                conditions: JSON.parse(JSON.stringify(q.conditions ?? [])),
                sort: JSON.parse(JSON.stringify(q.sort ?? [])),
                limit: q.limit ?? '',
                with: Array.isArray(q.with) ? [...q.with] : [],
            };
            // If editing an existing query that already has a variable_name,
            // treat it as manually set so we don't overwrite it.
            this._variableNameManuallyEdited = !!q.variable_name?.trim();
        } else {
            this.form = this._blankForm();
            this._variableNameManuallyEdited = false;
        }
        this.errorMessage = null;
    }

    _blankForm() {
        return {
            label: '',
            variable_name: '',
            description: '',
            model_type: '',
            conditions: [],
            sort: [],
            limit: '',
            with: [],
        };
    }

    // -------------------------------------------------------------------------
    // Resource types
    // Priority: @resourceTypes arg > service-registered types > built-in defaults
    // -------------------------------------------------------------------------

    get resourceTypes() {
        // 1. Explicit override from the consumer
        if (this.args.resourceTypes?.length) {
            return this.args.resourceTypes;
        }
        // 2. Service-registered types from extensions
        const serviceTypes = this.templateBuilderService?.resourceTypes ?? [];
        if (serviceTypes.length) {
            return serviceTypes;
        }
        // 3. Built-in defaults (core Fleetbase models)
        return [
            { value: 'Fleetbase\\Models\\Order', label: 'Order', icon: 'box' },
            { value: 'Fleetbase\\Models\\Driver', label: 'Driver', icon: 'id-card' },
            { value: 'Fleetbase\\Models\\Vehicle', label: 'Vehicle', icon: 'truck' },
            { value: 'Fleetbase\\Models\\Contact', label: 'Contact', icon: 'address-book' },
            { value: 'Fleetbase\\Models\\Place', label: 'Place', icon: 'location-dot' },
            { value: 'Fleetbase\\Models\\Vendor', label: 'Vendor', icon: 'building' },
            { value: 'Fleetbase\\Models\\Payload', label: 'Payload', icon: 'boxes-stacked' },
            { value: 'Fleetbase\\Models\\Entity', label: 'Entity', icon: 'cube' },
            { value: 'Fleetbase\\Models\\TrackingStatus', label: 'Tracking Status', icon: 'satellite-dish' },
            { value: 'Fleetbase\\Models\\Zone', label: 'Zone', icon: 'draw-polygon' },
            { value: 'Fleetbase\\Models\\ServiceArea', label: 'Service Area', icon: 'map' },
            { value: 'Fleetbase\\Models\\Route', label: 'Route', icon: 'route' },
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
        return (this.form.with ?? []).join(', ');
    }

    @action
    updateWith(event) {
        const raw = event.target.value;
        this.form = {
            ...this.form,
            with: raw
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
        };
    }

    // -------------------------------------------------------------------------
    // Field updates
    // -------------------------------------------------------------------------

    @action
    updateField(field, event) {
        const value = event.target.value;

        if (field === 'label') {
            // Auto-derive variable_name from label while the user hasn't
            // manually edited the variable_name field.
            const derived = this._variableNameManuallyEdited ? this.form.variable_name : this._deriveVariableName(value);
            this.form = { ...this.form, label: value, variable_name: derived };
        } else if (field === 'variable_name') {
            // Mark as manually edited so auto-derive stops overwriting it.
            this._variableNameManuallyEdited = true;
            this.form = { ...this.form, variable_name: value };
        } else {
            this.form = { ...this.form, [field]: value };
        }
    }

    @action
    updateNumericField(field, event) {
        const raw = event.target.value;
        this.form = { ...this.form, [field]: raw === '' ? '' : parseInt(raw, 10) };
    }

    @action
    selectResourceType(value) {
        this.form = { ...this.form, model_type: value };
    }

    // -------------------------------------------------------------------------
    // Conditions
    // -------------------------------------------------------------------------

    @action
    addCondition() {
        this.form = {
            ...this.form,
            conditions: [...this.form.conditions, { field: '', operator: '=', value: '' }],
        };
    }

    @action
    updateConditionField(index, field, event) {
        const value = event.target.value;
        const conditions = this.form.conditions.map((c, i) => (i === index ? { ...c, [field]: value } : c));
        this.form = { ...this.form, conditions };
    }

    @action
    removeCondition(index) {
        this.form = {
            ...this.form,
            conditions: this.form.conditions.filter((_, i) => i !== index),
        };
    }

    // -------------------------------------------------------------------------
    // Sort
    // -------------------------------------------------------------------------

    @action
    addSort() {
        this.form = {
            ...this.form,
            sort: [...this.form.sort, { field: '', direction: 'asc' }],
        };
    }

    @action
    updateSortField(index, field, event) {
        const value = event.target.value;
        const sort = this.form.sort.map((s, i) => (i === index ? { ...s, [field]: value } : s));
        this.form = { ...this.form, sort };
    }

    @action
    removeSort(index) {
        this.form = {
            ...this.form,
            sort: this.form.sort.filter((_, i) => i !== index),
        };
    }

    // -------------------------------------------------------------------------
    // Save / Cancel
    // -------------------------------------------------------------------------

    @action
    save() {
        this.errorMessage = null;

        if (!this.form.label?.trim()) {
            this.errorMessage = 'Label is required.';
            return;
        }
        if (!this.form.model_type) {
            this.errorMessage = 'Please select a resource type.';
            return;
        }

        const data = {
            // Preserve the existing UUID so the backend can update vs. create
            uuid: this.args.query?.uuid ?? null,
            label: this.form.label.trim(),
            variable_name: this.form.variable_name.trim() || this._deriveVariableName(this.form.label),
            description: this.form.description?.trim() ?? '',
            model_type: this.form.model_type,
            conditions: this.form.conditions.filter((c) => c.field?.trim()),
            sort: this.form.sort.filter((s) => s.field?.trim()),
            limit: this.form.limit === '' ? null : this.form.limit,
            with: this.form.with,
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
