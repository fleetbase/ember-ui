import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | table', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('columns', [{ label: 'Name', valuePath: 'name' }]);
        this.set('rows', []);
    });

    test('it renders', async function (assert) {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<Table />`);

        assert.dom(this.element).hasText('');

        // Template block usage:
        await render(hbs`
      <Table>
        template block text
      </Table>
    `);

        assert.dom(this.element).hasText('template block text');
    });

    test('it renders fallback empty state content', async function (assert) {
        await render(hbs`
            <Table
                @rows={{this.rows}}
                @columns={{this.columns}}
                @emptyStateTitle="No orders yet"
                @emptyStateDescription="Create your first order."
            />
        `);

        assert.dom('.next-table-empty-state-title').hasText('No orders yet');
        assert.dom('.next-table-empty-state-description').hasText('Create your first order.');
    });

    test('it renders an empty state component', async function (assert) {
        this.owner.register('template:components/test-empty-state', hbs`<div data-test-empty-state-component>Component empty: {{@context.rows.length}}</div>`);

        await render(hbs`
            <Table
                @rows={{this.rows}}
                @columns={{this.columns}}
                @emptyStateComponent={{component "test-empty-state"}}
            />
        `);

        assert.dom('[data-test-empty-state-component]').hasText('Component empty: 0');
    });

    test('it renders a named empty state block', async function (assert) {
        await render(hbs`
            <Table @rows={{this.rows}} @columns={{this.columns}}>
                <:emptyState as |state|>
                    <div data-test-empty-state-block>Block empty: {{state.rows.length}}</div>
                </:emptyState>
            </Table>
        `);

        assert.dom('[data-test-empty-state-block]').hasText('Block empty: 0');
    });
});
