import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | oauth-provider-button', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.provider = { id: 'google', label: 'Google', icon: 'google' };
    });

    test('it is a btn-auth block button carrying the provider', async function (assert) {
        await render(hbs`<OauthProviderButton @provider={{this.provider}} />`);

        assert.dom('.btn-wrapper').hasClass('btn-block').hasClass('btn-auth').hasClass('oauth-provider-google');
        assert.dom('[data-test-oauth-provider="google"]').exists();
    });

    test('the logo sits in the icon slot, at the far left', async function (assert) {
        await render(hbs`<OauthProviderButton @provider={{this.provider}} />`);

        assert.dom('button .btn-icon-wrapper .oauth-provider-logo-google').exists();
    });

    test('it shows the given text, or the provider label', async function (assert) {
        await render(hbs`<OauthProviderButton @provider={{this.provider}} @text="Continue with Google" />`);
        assert.dom('button').hasText('Continue with Google');

        await render(hbs`<OauthProviderButton @provider={{this.provider}} />`);
        assert.dom('button').hasText('Google');
    });

    test('clicking calls onClick with the provider', async function (assert) {
        this.clicked = [];
        this.onClick = (provider) => this.clicked.push(provider);
        await render(hbs`<OauthProviderButton @provider={{this.provider}} @onClick={{this.onClick}} />`);

        await click('button');

        assert.deepEqual(this.clicked, [this.provider]);
    });

    test('a disabled button does not call onClick', async function (assert) {
        this.clicked = [];
        this.onClick = (provider) => this.clicked.push(provider);
        await render(hbs`<OauthProviderButton @provider={{this.provider}} @disabled={{true}} @onClick={{this.onClick}} />`);

        assert.dom('button').isDisabled();
        assert.deepEqual(this.clicked, []);
    });

    test('clicking without an onClick does nothing', async function (assert) {
        await render(hbs`<OauthProviderButton @provider={{this.provider}} />`);

        await click('button');

        assert.dom('button').exists();
    });
});
