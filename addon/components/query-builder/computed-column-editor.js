import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class QueryBuilderComputedColumnEditorComponent extends Component {
    @service fetch;
    @service notifications;

    @tracked name = '';
    @tracked label = '';
    @tracked expression = '';
    @tracked description = '';
    @tracked type = 'string';
    @tracked isValidating = false;
    @tracked validationErrors = [];
    @tracked isValid = false;

    constructor() {
        super(...arguments);

        // If editing existing computed column, load its values
        if (this.args.computedColumn) {
            this.name = this.args.computedColumn.name || '';
            this.label = this.args.computedColumn.label || '';
            this.expression = this.args.computedColumn.expression || '';
            this.description = this.args.computedColumn.description || '';
            this.type = this.args.computedColumn.type || 'string';
        }
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
        return this.name && this.label && this.expression && !this.isValidating;
    }

    @action
    updateName(event) {
        this.name = event.target.value;
        this.validateExpression();
    }

    @action
    updateLabel(event) {
        this.label = event.target.value;
    }

    @action
    updateExpression(event) {
        this.expression = event.target.value;
        this.validateExpression();
    }

    @action
    updateDescription(event) {
        this.description = event.target.value;
    }

    @action
    updateType(value) {
        this.type = value;
    }

    @action
    async validateExpression() {
        if (!this.expression || !this.args.tableName) {
            this.validationErrors = [];
            this.isValid = false;
            return;
        }

        this.isValidating = true;
        this.validationErrors = [];

        try {
            const response = await this.fetch.post('reports/validate-computed-column', {
                expression: this.expression,
                table_name: this.args.tableName,
            });

            if (response.valid) {
                this.isValid = true;
                this.validationErrors = [];
            } else {
                this.isValid = false;
                this.validationErrors = response.errors || ['Expression is invalid'];
            }
        } catch (error) {
            this.isValid = false;
            this.validationErrors = ['Failed to validate expression'];
            console.error('Validation error:', error);
        } finally {
            this.isValidating = false;
        }
    }

    @action
    useExample(example) {
        this.expression = example.expression;
        this.validateExpression();
    }

    @action
    save() {
        if (!this.canSave) {
            return;
        }

        const computedColumn = {
            name: this.name,
            label: this.label,
            expression: this.expression,
            description: this.description,
            type: this.type,
        };

        if (this.args.onSave) {
            this.args.onSave(computedColumn);
        }
    }

    @action
    cancel() {
        if (this.args.onCancel) {
            this.args.onCancel();
        }
    }
}
