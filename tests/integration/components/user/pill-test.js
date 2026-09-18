import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | user/pill', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the user name and email', async function (assert) {
        this.set('user', { name: 'Ada Lovelace', email: 'ada@example.com', avatar_url: '/img/ada.png' });

        await render(hbs`<User::Pill @user={{this.user}} />`);

        assert.dom(this.element).containsText('Ada Lovelace');
        assert.dom(this.element).containsText('ada@example.com');
    });

    test('@resource is accepted as an alias for @user', async function (assert) {
        this.set('resource', { name: 'Grace Hopper', email: 'grace@example.com' });

        await render(hbs`<User::Pill @resource={{this.resource}} />`);

        assert.dom(this.element).containsText('Grace Hopper');
    });

    test('@user wins when both are supplied', async function (assert) {
        this.set('user', { name: 'From user' });
        this.set('resource', { name: 'From resource' });

        await render(hbs`<User::Pill @user={{this.user}} @resource={{this.resource}} />`);

        assert.dom(this.element).containsText('From user');
        assert.dom(this.element).doesNotContainText('From resource');
    });

    test('it falls back to resource when user is explicitly nullish', async function (assert) {
        this.set('user', null);
        this.set('resource', { name: 'From resource' });

        await render(hbs`<User::Pill @user={{this.user}} @resource={{this.resource}} />`);

        assert.dom(this.element).containsText('From resource', 'null falls through the ?? to the resource');
    });

    test('it shows the default fallback title when there is no user', async function (assert) {
        await render(hbs`<User::Pill />`);

        assert.dom(this.element).containsText('No user');
    });

    test('@titleFallback overrides the default fallback title', async function (assert) {
        await render(hbs`<User::Pill @titleFallback="Unassigned" />`);

        assert.dom(this.element).containsText('Unassigned');
        assert.dom(this.element).doesNotContainText('No user');
    });

    test('a user without an email shows the no-email placeholder', async function (assert) {
        this.set('user', { name: 'Ada Lovelace' });

        await render(hbs`<User::Pill @user={{this.user}} />`);

        assert.dom(this.element).containsText('No email');
    });

    test('with no user at all the subtitle is a dash', async function (assert) {
        await render(hbs`<User::Pill />`);

        assert.dom(this.element).containsText('-', 'the absent-user subtitle differs from the no-email one');
        assert.dom(this.element).doesNotContainText('No email');
    });

    test('it invokes @onClick', async function (assert) {
        let clicks = 0;
        this.set('user', { name: 'Ada', email: 'ada@example.com' });
        this.set('onClick', () => clicks++);

        await render(hbs`<User::Pill @user={{this.user}} @onClick={{this.onClick}} />`);
        await click('a');

        assert.strictEqual(clicks, 1);
    });

    test('it applies the pass-through class arguments', async function (assert) {
        this.set('user', { name: 'Ada', email: 'ada@example.com' });

        await render(hbs`<User::Pill @user={{this.user}} @anchorClass="anchor-x" @titleClass="title-x" @subtitleClass="subtitle-x" />`);

        assert.dom('.anchor-x').exists('anchorClass reaches the anchor');
        assert.dom('.title-x').exists('titleClass reaches the title');
        assert.dom('.subtitle-x').exists('subtitleClass reaches the subtitle');
    });

    test('it forwards splattributes', async function (assert) {
        this.set('user', { name: 'Ada' });

        await render(hbs`<User::Pill @user={{this.user}} data-test-pill="yes" />`);

        assert.dom('[data-test-pill="yes"]').exists();
    });

    test('it updates when the user changes', async function (assert) {
        this.set('user', { name: 'Ada Lovelace', email: 'ada@example.com' });
        await render(hbs`<User::Pill @user={{this.user}} />`);
        assert.dom(this.element).containsText('Ada Lovelace');

        this.set('user', { name: 'Grace Hopper', email: 'grace@example.com' });
        assert.dom(this.element).containsText('Grace Hopper');
        assert.dom(this.element).doesNotContainText('Ada Lovelace');
    });

    module('the arguments that override the user family defaults', function () {
        test('an explicit @subtitle wins over the email and the placeholders', async function (assert) {
            this.set('user', { name: 'Ada Lovelace', email: 'ada@example.com' });

            await render(hbs`<User::Pill @user={{this.user}} @subtitle="Fleet manager" />`);

            assert.dom(this.element).containsText('Fleet manager');
            assert.dom(this.element).doesNotContainText('ada@example.com', 'the email is not shown as well');
        });

        test('an empty @subtitle is still an explicit choice', async function (assert) {
            this.set('user', { name: 'Ada Lovelace', email: 'ada@example.com' });

            await render(hbs`<User::Pill @user={{this.user}} @subtitle="" />`);

            assert.dom(this.element).doesNotContainText('ada@example.com', 'an empty subtitle is not undefined, so the email is not used');
        });

        test('@showOnlineIndicator decides the dot when it is given', async function (assert) {
            this.set('user', { name: 'Ada', email: 'ada@example.com', online: true });

            await render(hbs`<User::Pill @user={{this.user}} @showOnlineIndicator={{true}} />`);
            assert.dom('[data-test-pill-online-indicator]').exists('the dot is shown when asked for');

            await render(hbs`<User::Pill @user={{this.user}} @showOnlineIndicator={{false}} />`);
            assert.dom('[data-test-pill-online-indicator]').doesNotExist('and withheld when refused');
        });

        test('@onlinePath asks for the dot and reads the flag from that path', async function (assert) {
            this.set('user', { name: 'Ada', email: 'ada@example.com', is_active: true, online: false });

            await render(hbs`<User::Pill @user={{this.user}} @onlinePath="is_active" />`);

            assert.dom('[data-test-pill-online-indicator]').exists('naming a path is enough to ask for the dot');
            assert.dom('[data-test-pill-online-indicator]').hasClass('text-green-500', 'and the flag is read from that path, not the default one');
        });

        test('@onlinePath reports offline when the path is falsey', async function (assert) {
            this.set('user', { name: 'Ada', email: 'ada@example.com', is_active: false, online: true });

            await render(hbs`<User::Pill @user={{this.user}} @onlinePath="is_active" />`);

            assert.dom('[data-test-pill-online-indicator]').hasClass('text-yellow-200', 'the named path wins over the default online flag');
        });

        test('@onlinePath with no user at all reports nothing rather than reading a path off nothing', async function (assert) {
            await render(hbs`<User::Pill @onlinePath="is_active" />`);

            assert.dom('[data-test-pill-online-indicator]').exists('the dot is still asked for');
            assert.dom('[data-test-pill-online-indicator]').hasClass('text-yellow-200', 'and with no user it reads as offline');
        });
    });
});
