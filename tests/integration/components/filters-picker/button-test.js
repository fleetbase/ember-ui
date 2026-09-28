import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, find, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const BUTTON = 'button';
const BADGE = '.box-divider span';

module('Integration | Component | filters-picker/button', function (hooks) {
    setupRenderingTest(hooks);

    const TEMPLATE = hbs`
        <FiltersPicker::Button
            @text={{this.text}}
            @icon={{this.icon}}
            @type={{this.type}}
            @size={{this.size}}
            @wrapperClass={{this.wrapperClass}}
            @buttonComponentArgs={{this.buttonComponentArgs}}
        />
    `;

    module('rendering', function () {
        test('it renders a filter button with a default icon', async function (assert) {
            await render(TEMPLATE);

            assert.dom(BUTTON).exists();
            assert.dom(`${BUTTON} svg`).hasClass('fa-filter');
            assert.dom(BUTTON).hasClass('btn-xs', 'extra small by default');
        });

        test('the label, icon, size and type can be replaced', async function (assert) {
            this.setProperties({ text: 'Narrow down', icon: 'sliders', size: 'sm', type: 'primary' });

            await render(TEMPLATE);

            assert.dom(BUTTON).containsText('Narrow down');
            assert.dom(`${BUTTON} svg`).hasClass('fa-sliders');
            assert.dom(BUTTON).hasClass('btn-sm');
            assert.dom(BUTTON).hasClass('btn-primary');
        });

        test('a wrapper class is applied', async function (assert) {
            this.set('wrapperClass', 'my-wrapper');

            await render(TEMPLATE);

            assert.dom('.my-wrapper').exists();
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<FiltersPicker::Button data-test-filter-button="yes" />`);

            assert.dom(BUTTON).hasAttribute('data-test-filter-button', 'yes');
        });
    });

    module('the active filter count', function () {
        test('no badge is shown when nothing is filtered', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(find(BADGE), null);
        });

        test('an empty filter list shows no badge', async function (assert) {
            this.set('buttonComponentArgs', { activeFilters: [] });

            await render(TEMPLATE);

            assert.strictEqual(find(BADGE), null);
        });

        test('active filters are counted in a badge', async function (assert) {
            this.set('buttonComponentArgs', { activeFilters: ['status', 'driver'] });

            await render(TEMPLATE);

            assert.dom(BADGE).hasText('2');
        });

        test('the count follows the filters as they change', async function (assert) {
            this.set('buttonComponentArgs', { activeFilters: ['status'] });

            await render(TEMPLATE);
            assert.dom(BADGE).hasText('1');

            this.set('buttonComponentArgs', { activeFilters: ['status', 'driver', 'depot'] });
            assert.dom(BADGE).hasText('3', 'the badge is refreshed');

            this.set('buttonComponentArgs', {});
            assert.strictEqual(find(BADGE), null, 'and disappears when nothing is filtered');
        });

        test('the picker can ask for an icon-only button', async function (assert) {
            this.setProperties({ text: 'Narrow down', buttonComponentArgs: { iconOnly: true } });

            await render(TEMPLATE);

            assert.dom(BUTTON).doesNotContainText('Narrow down');
            assert.ok(find(`${BUTTON} svg`), 'only the icon remains');
        });

        test('the icon-only choice follows the picker', async function (assert) {
            this.setProperties({ text: 'Narrow down', buttonComponentArgs: { iconOnly: true } });

            await render(TEMPLATE);
            assert.dom(BUTTON).doesNotContainText('Narrow down');

            this.set('buttonComponentArgs', { iconOnly: false });
            assert.dom(BUTTON).containsText('Narrow down', 'the label comes back');
        });
    });
    // The did-update handler destructures with a default, which only applies when the argument
    // changes *to* undefined — a caller clearing its filter state.
    test('clearing @buttonComponentArgs drops the active-filter badge', async function (assert) {
        this.set('buttonComponentArgs', { activeFilters: ['status', 'type'] });

        await render(TEMPLATE);
        assert.dom(BADGE).hasText('2', 'the badge counts the active filters');

        this.set('buttonComponentArgs', undefined);
        await settled();

        assert.dom(BADGE).doesNotExist('a cleared argument falls back to an empty object');
    });
});
