import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class ModalsQueryBuilderComputedColumnEditorComponent extends Component {
    @service fetch;
    @service notifications;
    @service modalsManager;
    @tracked name = '';
    @tracked label = '';
    @tracked expression = '';
    @tracked description = '';
    @tracked type = this.typeOptions[0];
    @tracked isValidating = false;
    @tracked validationErrors = [];
    @tracked isValid = false;

    constructor() {
        super(...arguments);

        const computedColumn = this.modalsManager.getOption('computedColumn', {});
        // If editing existing computed column, load its values
        if (computedColumn) {
            this.name = computedColumn.name || '';
            this.label = computedColumn.label || '';
            this.expression = computedColumn.expression || '';
            this.description = computedColumn.description || '';
            const type = computedColumn.type || 'string';
            this.type = this.typeOptions.find((t) => t.value === type);
        }

        this.modalsManager.setOption('modalComponentInstance', this);
    }

    get typeOptions() {
        return [
            { value: 'string', label: 'Text' },
            { value: 'integer', label: 'Integer' },
            { value: 'decimal', label: 'Decimal' },
            { value: 'date', label: 'Date' },
            { value: 'datetime', label: 'Date & Time' },
            { value: 'boolean', label: 'Boolean' },
        ];
    }

    get allowedFunctions() {
        return [
            'DATEDIFF',
            'DATE_ADD',
            'DATE_SUB',
            'CONCAT',
            'COALESCE',
            'IFNULL',
            'CASE/WHEN/THEN/ELSE/END',
            'LEAST',
            'GREATEST',
            'ROUND',
            'ABS',
            'UPPER',
            'LOWER',
            'TRIM',
            'LENGTH',
            'NULLIF',
        ];
    }

    get exampleExpressions() {
        return [
            {
                name: 'Calculate Days Between Dates',
                expression: 'DATEDIFF(end_date, start_date) + 1',
                description: 'Calculate the number of days between two dates',
            },
            {
                name: 'Concatenate Fields',
                expression: "CONCAT(first_name, ' ', last_name)",
                description: 'Combine multiple text fields',
            },
            {
                name: 'Conditional Value',
                expression: "CASE WHEN amount > 100 THEN 'High' ELSE 'Low' END",
                description: 'Return different values based on conditions',
            },
            {
                name: 'Safe Division',
                expression: 'ROUND(amount / NULLIF(quantity, 0), 2)',
                description: 'Divide with protection against division by zero',
            },
        ];
    }

    get canSave() {
        const canSave = this.name && this.label && this.expression && !this.isValidating;
        this.modalsManager.setOption('canSave', canSave);
        return canSave;
    }

    @action useExample(example) {
        this.expression = example.expression;
        this.validateExpression();
    }

    @action async validateExpression() {
        if (!this.expression || !this.modalsManager.getOption('tableName')) {
            this.validationErrors = [];
            this.isValid = false;
            return this.isValid;
        }

        this.isValidating = true;
        this.validationErrors = [];

        try {
            const response = await this.fetch.post(
                'reports/validate-computed-column',
                {
                    expression: this.expression,
                    table_name: this.modalsManager.getOption('tableName'),
                },
                { rawError: true }
            );

            if (response.valid) {
                this.isValid = true;
                this.validationErrors = [];
            } else {
                this.isValid = false;
                this.validationErrors = response.errors ?? ['Expression is invalid'];
            }

            return this.isValid;
        } catch (error) {
            this.isValid = false;
            this.validationErrors = error.errors ?? ['Failed to validate expression'];
            return this.isValid;
        } finally {
            this.isValidating = false;
        }
    }

    @action save() {
        if (!this.canSave) return;

        const computedColumn = {
            name: this.name,
            label: this.label,
            expression: this.expression,
            description: this.description,
            type: this.type?.value ?? 'string',
        };

        this.modalsManager.setOption('computedColumn', computedColumn);
        return computedColumn;
    }
}
