import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | app-container', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders a single empty container element when no block is given', async function (assert) {
        await render(hbs`<AppContainer />`);

        assert.dom('.app--container').exists({ count: 1 }, 'exactly one container wrapper is rendered');
        assert.dom('.app--container').hasTagName('div');
        assert.dom('.app--container').hasText('', 'the container has no content of its own');
        assert.strictEqual(this.element.querySelector('.app--container').children.length, 0, 'no children are rendered without a block');
    });

    test('it yields block content as children of the container', async function (assert) {
        await render(hbs`
            <AppContainer>
                <div class="app-body">Fleet dashboard</div>
            </AppContainer>
        `);

        assert.dom('.app--container > .app-body').exists('yielded content is rendered inside the container');
        assert.dom('.app--container').hasText('Fleet dashboard');
    });

    test('it preserves the order of multiple yielded children', async function (assert) {
        await render(hbs`
            <AppContainer>
                <aside class="app-sidebar">Sidebar</aside>
                <main class="app-main">Main</main>
                <footer class="app-footer">Footer</footer>
            </AppContainer>
        `);

        const classes = Array.from(this.element.querySelectorAll('.app--container > *')).map((element) => element.className);
        assert.deepEqual(classes, ['app-sidebar', 'app-main', 'app-footer'], 'children are yielded in template order');
    });

    test('it re-renders yielded content when the yielded state changes', async function (assert) {
        this.set('label', 'Loading fleet');

        await render(hbs`<AppContainer><span class="app-label">{{this.label}}</span></AppContainer>`);

        assert.dom('.app--container .app-label').hasText('Loading fleet');

        this.set('label', 'Fleet ready');

        assert.dom('.app--container .app-label').hasText('Fleet ready', 'yielded content stays bound to the outer scope');
        assert.dom('.app--container').exists({ count: 1 }, 'the container is not duplicated on update');
    });
});
