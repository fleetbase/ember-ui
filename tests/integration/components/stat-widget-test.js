import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | stat-widget', function (hooks) {
    setupRenderingTest(hooks);

    const TEMPLATE = hbs`
        <StatWidget
            @title={{this.title}}
            @value={{this.value}}
            @isLoading={{this.isLoading}}
            @loadingMessage={{this.loadingMessage}}
            @titleClass={{this.titleClass}}
            @valueClass={{this.valueClass}}
        />
    `;

    test('it renders a title and a value', async function (assert) {
        this.set('title', 'Total orders');
        this.set('value', 1200);

        await render(TEMPLATE);

        assert.dom('h3').hasText('Total orders');
        assert.dom('h2').hasText('1200');
    });

    test('a zero value is still rendered', async function (assert) {
        this.set('title', 'Failures');
        this.set('value', 0);

        await render(TEMPLATE);

        assert.dom('h2').hasText('0');
    });

    test('while loading it shows a spinner instead of the figures', async function (assert) {
        this.set('title', 'Total orders');
        this.set('value', 1200);
        this.set('isLoading', true);
        this.set('loadingMessage', 'Crunching');

        await render(TEMPLATE);

        assert.dom('h2').doesNotExist('the value is hidden while loading');
        assert.dom('h3').doesNotExist();
        assert.dom(this.element).containsText('Crunching');
    });

    test('title and value classes are applied', async function (assert) {
        this.set('title', 'Titled');
        this.set('value', 1);
        this.set('titleClass', 'my-title');
        this.set('valueClass', 'my-value');

        await render(TEMPLATE);

        assert.dom('h3').hasClass('my-title');
        assert.dom('h2').hasClass('my-value');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<StatWidget @title="T" @value="1" data-test-stat="yes" />`);

        assert.dom('[data-test-stat="yes"]').exists();
    });
});
