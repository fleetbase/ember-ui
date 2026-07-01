import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | table/cell/dropdown', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders', async function (assert) {
        // Set any properties with this.set('myProperty', 'value');
        // Handle any actions with this.set('myAction', function(val) { ... });

        await render(hbs`<Table::Cell::Dropdown />`);

        assert.dom(this.element).hasText('');

        // Template block usage:
        await render(hbs`
      <Table::Cell::Dropdown>
        template block text
      </Table::Cell::Dropdown>
    `);

        assert.dom(this.element).hasText('template block text');
    });

    test('it supports custom and default dropdown positioning', function (assert) {
        const ComponentClass = this.owner.factoryFor('component:table/cell/dropdown').class;
        const trigger = {
            getBoundingClientRect() {
                return { left: 500, top: 120 };
            },
        };
        const content = {
            getBoundingClientRect() {
                return { width: 220 };
            },
        };
        const defaultComponent = new ComponentClass(this.owner, { column: {} });
        const customPosition = { style: { left: 10, top: 20 } };
        const customComponent = new ComponentClass(this.owner, {
            column: {
                calculatePosition(receivedTrigger, receivedContent) {
                    assert.strictEqual(receivedTrigger, trigger, 'custom calculator receives trigger');
                    assert.strictEqual(receivedContent, content, 'custom calculator receives content');

                    return customPosition;
                },
            },
        });

        assert.deepEqual(defaultComponent.calculatePosition(trigger, content), {
            style: {
                position: 'fixed',
                marginTop: '0px',
                left: 277,
                top: 120,
            },
        });
        assert.strictEqual(customComponent.calculatePosition(trigger, content), customPosition, 'custom calculator result is used');
    });

    test('it defaults renderInPlace to true and preserves explicit false', function (assert) {
        const ComponentClass = this.owner.factoryFor('component:table/cell/dropdown').class;
        const defaultComponent = new ComponentClass(this.owner, { column: {} });
        const disabledInPlaceComponent = new ComponentClass(this.owner, { column: { renderInPlace: false } });

        assert.true(defaultComponent.renderInPlace, 'renderInPlace defaults to true');
        assert.false(disabledInPlaceComponent.renderInPlace, 'explicit renderInPlace false is preserved');
    });
});
