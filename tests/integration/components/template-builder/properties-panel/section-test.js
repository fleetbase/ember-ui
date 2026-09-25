import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const SECTION = '.tb-prop-section';
const HEADER = `${SECTION} button`;

module('Integration | Component | template-builder/properties-panel/section', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders its title and a chevron that follows the open state', async function (assert) {
        await render(hbs`<TemplateBuilder::PropertiesPanel::Section @title="Layout" @isOpen={{this.isOpen}} />`);

        assert.dom(SECTION).includesText('Layout');
        assert.dom(`${HEADER} .fa-chevron-down`).exists('a closed section points down');

        this.set('isOpen', true);

        assert.dom(`${HEADER} .fa-chevron-up`).exists('an open one points up');
        assert.dom(`${HEADER} .fa-chevron-down`).doesNotExist();
    });

    test('an icon is rendered when one is given', async function (assert) {
        await render(hbs`<TemplateBuilder::PropertiesPanel::Section @title="Layout" @icon="ruler" />`);

        assert.dom(`${HEADER} .fa-ruler`).exists();
    });

    test('no icon is rendered without one', async function (assert) {
        await render(hbs`<TemplateBuilder::PropertiesPanel::Section @title="Layout" />`);

        // The chevron is always present; the leading icon slot should be empty.
        assert.dom(`${HEADER} .flex.items-center.space-x-2 svg`).doesNotExist();
    });

    test('the block is only rendered while the section is open', async function (assert) {
        await render(hbs`
            <TemplateBuilder::PropertiesPanel::Section @title="Layout" @isOpen={{this.isOpen}}>
                <div class="section-body">contents</div>
            </TemplateBuilder::PropertiesPanel::Section>
        `);

        assert.dom('.section-body').doesNotExist('a closed section hides its contents');

        this.set('isOpen', true);

        assert.dom('.section-body').hasText('contents');
    });

    test('clicking the header reports through @onToggle', async function (assert) {
        const toggles = [];
        this.set('onToggle', () => toggles.push('toggle'));

        await render(hbs`<TemplateBuilder::PropertiesPanel::Section @title="Layout" @onToggle={{this.onToggle}} />`);
        await click(HEADER);

        assert.deepEqual(toggles, ['toggle']);
    });

    test('clicking without an @onToggle handler is inert', async function (assert) {
        await render(hbs`<TemplateBuilder::PropertiesPanel::Section @title="Layout" />`);
        await click(HEADER);

        assert.ok(find(SECTION), 'the section survives a click it has nothing to do with');
    });
});
