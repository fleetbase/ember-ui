import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | layout/header/loading-indicator', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders a loading indicator container', async function (assert) {
        await render(hbs`<Layout::Header::LoadingIndicator />`);

        assert.dom('.console-loading-indicator').exists();
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<Layout::Header::LoadingIndicator data-test-loading="yes" />`);

        assert.dom('.console-loading-indicator').hasAttribute('data-test-loading', 'yes');
    });

    test('no spinner is shown when nothing is loading', async function (assert) {
        await render(hbs`<Layout::Header::LoadingIndicator />`);

        assert.dom('.console-loading-indicator svg').doesNotExist('the indicator is idle by default');
    });
});
