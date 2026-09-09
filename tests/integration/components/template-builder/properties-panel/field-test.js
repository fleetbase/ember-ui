import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const FIELD = '.tb-prop-field';

module('Integration | Component | template-builder/properties-panel/field', function (hooks) {
    setupRenderingTest(hooks);

    test('it labels its block', async function (assert) {
        await render(hbs`
            <TemplateBuilder::PropertiesPanel::Field @label="Width">
                <input type="text" class="field-control" />
            </TemplateBuilder::PropertiesPanel::Field>
        `);

        assert.dom(`${FIELD} label`).hasText('Width');
        assert.dom('.field-control').exists('the block is rendered beneath it');
    });

    test('a field with no label renders none', async function (assert) {
        await render(hbs`
            <TemplateBuilder::PropertiesPanel::Field>
                <input type="text" class="field-control" />
            </TemplateBuilder::PropertiesPanel::Field>
        `);

        assert.dom(`${FIELD} label`).doesNotExist();
        assert.dom('.field-control').exists('the control is still rendered');
    });

    test('a span of 2 makes the field full width', async function (assert) {
        await render(hbs`<TemplateBuilder::PropertiesPanel::Field @label="Notes" @span="2" />`);

        assert.dom(FIELD).hasClass('col-span-2');
    });

    test('any other span leaves it in a single column', async function (assert) {
        await render(hbs`<TemplateBuilder::PropertiesPanel::Field @label="Width" @span="1" />`);
        assert.dom(FIELD).doesNotHaveClass('col-span-2');

        await render(hbs`<TemplateBuilder::PropertiesPanel::Field @label="Width" />`);
        assert.dom(FIELD).doesNotHaveClass('col-span-2', 'and so does omitting it');
    });

    test('a numeric span does not match the string comparison', async function (assert) {
        await render(hbs`<TemplateBuilder::PropertiesPanel::Field @label="Notes" @span={{2}} />`);

        assert.dom(FIELD).doesNotHaveClass('col-span-2', 'the check is against the string "2"');
    });
});
