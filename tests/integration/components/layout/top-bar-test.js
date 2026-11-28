import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import Evented from '@ember/object/evented';
import { tracked } from '@glimmer/tracking';
import { setupShellStubs } from '../../../helpers/shell-stubs';
import { modifierKeyLabel } from '@fleetbase/ember-ui/utils/shell';

class DesktopMediaStub extends Service.extend(Evented) {
    isMobile = false;
}

class LanguageStub extends Service {
    @tracked currentLocale = 'en-us';
    languages = [
        { locale: 'en-us', language: 'English' },
        { locale: 'fr-fr', language: 'Français' },
    ];
    changes = [];

    changeLocale(locale) {
        this.changes.push(locale);
        this.currentLocale = locale;
    }
}

class ThemeStub extends Service {
    @tracked activeTheme = 'dark';
    calls = [];

    setTheme(theme) {
        this.calls.push(theme);
        this.activeTheme = theme;
    }
}

class DocsPanelStub extends Service {
    opened = [];
    open(...args) {
        this.opened.push(args);
    }
}

const ORG = '.fb-top-bar-org-trigger';
const ACCOUNT = '.fb-top-bar-account-trigger';

module('Integration | Component | layout/top-bar', function (hooks) {
    setupRenderingTest(hooks);
    setupShellStubs(hooks);

    hooks.beforeEach(function () {
        this.owner.unregister('service:media');
        this.owner.register('service:media', DesktopMediaStub);
        this.owner.unregister('service:docs-panel');
        this.owner.register('service:docs-panel', DocsPanelStub);

        this.currentUser = this.owner.lookup('service:current-user');
        this.currentUser.organizations = [];
        this.currentUser.options = {};
        this.actions = [];
        this.onAction = (...args) => this.actions.push(args);
    });

    module('with the console’s language and theme services', function (hooks) {
        hooks.beforeEach(function () {
            this.owner.unregister('service:language');
            this.owner.register('service:language', LanguageStub);
            this.owner.unregister('service:theme');
            this.owner.register('service:theme', ThemeStub);
            this.language = this.owner.lookup('service:language');
            this.theme = this.owner.lookup('service:theme');
        });

        test('it keeps the classic mount points and renders the existing trays inside the tray', async function (assert) {
            await render(hbs`<Layout::TopBar class="extra" />`);

            assert.dom('.fb-top-bar').hasClass('extra');
            assert.dom('.fb-top-bar #view-header-actions').exists();
            assert.dom('.fb-top-bar #view-header-tray-items').exists();
            assert.dom('#view-header-tray-items .notification-tray').exists('NotificationTray');
            assert.dom('#view-header-tray-items .chat-tray').exists('ChatTray');
        });

        test('the search trigger opens the command palette', async function (assert) {
            const palette = this.owner.lookup('service:command-palette');
            await render(hbs`<Layout::TopBar />`);

            assert.dom('.fb-top-bar-search').hasAttribute('aria-label', `Search everything, ${modifierKeyLabel()}K`);
            assert.dom('.fb-top-bar-kbd').hasText(`${modifierKeyLabel()}K`);
            await click('.fb-top-bar-search');
            assert.true(palette.isOpen);
            palette.close();
        });

        test('the environment chip shows only when given, in its tone', async function (assert) {
            await render(hbs`<Layout::TopBar />`);
            assert.dom('.fb-env-chip').doesNotExist();

            await render(hbs`<Layout::TopBar @environment="Production" />`);
            assert.dom('.fb-env-chip.is-ok').hasText('Production');

            await render(hbs`<Layout::TopBar @environment="Sandbox" @environmentTone="warn" />`);
            assert.dom('.fb-env-chip.is-warn').hasText('Sandbox');
        });

        test('the organization switcher lists organizations and switches through @onAction', async function (assert) {
            this.currentUser.organizations = [
                { id: 'test-company-1', name: 'Test Company' },
                { id: 'acme', name: 'Acme Test Org' },
            ];
            await render(hbs`<Layout::TopBar @onAction={{this.onAction}} />`);

            assert.dom(ORG).hasAttribute('aria-label', 'Organization: Test Company').hasAttribute('title', 'Test Company');
            assert.dom(`${ORG} .fb-org-badge`).hasText('T');

            await click(ORG);
            const items = findAll('[role="menu"] button').map((item) => item.textContent.trim());
            assert.deepEqual(items, ['Test Company', 'Acme Test Org', 'Organization settings', 'Create or join organizations']);
            assert.dom('[role="menuitemradio"][aria-checked="true"]').hasText('Test Company').isDisabled();
            assert.dom('[role="separator"]').exists({ count: 1 });

            await click('[role="menuitemradio"][aria-checked="false"]');
            assert.strictEqual(this.actions[0][0], 'switchOrganization');
            assert.strictEqual(this.actions[0][1].id, 'acme');

            await click(ORG);
            await click(findAll('[role="menuitem"]')[1]);
            assert.deepEqual(this.actions[1], ['createOrJoinOrg']);

            await click(ORG);
            await click(findAll('[role="menuitem"]')[0]);
            assert.deepEqual(this.router.transitions, [['console.settings.index', { queryParams: {} }]]);
        });

        test('with no organizations loaded, only the organization links show', async function (assert) {
            this.currentUser.organizations = undefined;
            await render(hbs`<Layout::TopBar />`);
            await click(ORG);

            assert.dom('[role="separator"]').doesNotExist();
            assert.dom('[role="menuitem"]').exists({ count: 2 });
            await click(findAll('[role="menuitem"]')[1]);
            assert.dom('[role="menu"]').doesNotExist('an action without @onAction still closes the menu');
        });

        test('the account menu: identity, language, time zone and theme', async function (assert) {
            this.timezones = ['Asia/Singapore', 'Europe/Paris'];
            this.currentUser.timezone = 'Asia/Singapore';
            await render(hbs`<Layout::TopBar @timezones={{this.timezones}} @onAction={{this.onAction}} />`);

            assert.dom(ACCOUNT).hasAttribute('aria-label', 'Account, language and settings').hasAttribute('aria-haspopup', 'dialog');
            assert.dom(`${ACCOUNT} .fb-avatar`).hasText('TU');

            await click(ACCOUNT);
            assert.dom('.fb-account-identity').containsText('Test User').containsText('Administrator');
            assert.dom('.fb-account-language').hasValue('en-us');
            assert.dom('.fb-account-timezone').hasValue('Asia/Singapore');
            assert.dom('[data-theme-choice="dark"]').hasAttribute('aria-checked', 'true', 'the active theme is selected');

            await fillIn('.fb-account-language', 'fr-fr');
            assert.deepEqual(this.language.changes, ['fr-fr']);

            await fillIn('.fb-account-timezone', 'Europe/Paris');
            assert.strictEqual(this.currentUser.options.timezone, 'Europe/Paris');
            assert.deepEqual(this.actions, [['changeTimezone', 'Europe/Paris']]);

            await click('[data-theme-choice="light"]');
            assert.deepEqual(this.theme.calls, ['light']);
            assert.dom('[data-theme-choice="light"]').hasAttribute('aria-checked', 'true');
        });

        test('Auto follows the system colour scheme', async function (assert) {
            const nativeMatchMedia = window.matchMedia;
            try {
                window.matchMedia = () => ({ matches: true });
                await render(hbs`<Layout::TopBar />`);
                await click(ACCOUNT);
                await click('[data-theme-choice="system"]');
                assert.deepEqual(this.theme.calls, ['dark']);
                assert.dom('[data-theme-choice="system"]').hasAttribute('aria-checked', 'true', 'Auto is remembered as the choice');

                window.matchMedia = () => ({ matches: false });
                await click('[data-theme-choice="system"]');
                assert.deepEqual(this.theme.calls, ['dark', 'light']);
            } finally {
                window.matchMedia = nativeMatchMedia;
            }
        });

        test('time zones: the saved choice wins, the current one is always offered, and the browser list is the default', async function (assert) {
            this.currentUser.options = { timezone: 'Pacific/Chatham' };
            this.timezones = ['Asia/Singapore'];
            await render(hbs`<Layout::TopBar @timezones={{this.timezones}} />`);
            await click(ACCOUNT);
            assert.deepEqual(
                findAll('.fb-account-timezone option').map((option) => option.value),
                ['Pacific/Chatham', 'Asia/Singapore']
            );

            this.currentUser.options = {};
            this.currentUser.timezone = undefined;
            await render(hbs`<Layout::TopBar />`);
            await click(ACCOUNT);
            const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            assert.dom('.fb-account-timezone').hasValue(browserZone, 'falls back to the browser’s time zone');
            assert.true(findAll('.fb-account-timezone option').length > 100, 'every zone the browser knows');
        });

        test('the account links', async function (assert) {
            await render(hbs`<Layout::TopBar @onAction={{this.onAction}} />`);
            const docs = this.owner.lookup('service:docs-panel');

            for (const link of ['shortcuts', 'changelog', 'sign-out']) {
                await click(ACCOUNT);
                await click(`[data-account-link="${link}"]`);
            }
            assert.deepEqual(this.actions, [['showKeyboardShortcuts'], ['viewChangelog'], ['invalidateSession']]);
            assert.dom('.fb-account-menu').doesNotExist('each closes the menu');

            await click(ACCOUNT);
            await click('[data-account-link="docs"]');
            assert.strictEqual(docs.opened[0][0], 'https://www.fleetbase.io/docs');

            await click(ACCOUNT);
            await click('[data-account-link="profile"]');
            assert.deepEqual(this.router.transitions, [['console.account.index', { queryParams: {} }]]);
        });
    });

    test('extra account links sit above Sign out and run through @onAction', async function (assert) {
        this.links = [
            { id: 'layout', label: 'Switch to classic layout', action: 'switchLayout', params: ['classic'] },
            { id: 'plain', label: 'Plain', action: 'plainAction' },
        ];
        await render(hbs`<Layout::TopBar @onAction={{this.onAction}} @accountLinks={{this.links}} />`);
        await click(ACCOUNT);

        const ids = findAll('[data-account-link]').map((el) => el.dataset.accountLink);
        assert.deepEqual(ids.slice(-3), ['layout', 'plain', 'sign-out']);
        assert.dom('[data-account-link="layout"]').hasText('Switch to classic layout');

        await click('[data-account-link="layout"]');
        assert.dom('.fb-account-menu').doesNotExist('closes the menu');
        await click(ACCOUNT);
        await click('[data-account-link="plain"]');
        assert.deepEqual(this.actions, [['switchLayout', 'classic'], ['plainAction']]);
    });

    test('with the stub services that have no language list or active theme', async function (assert) {
        await render(hbs`<Layout::TopBar />`);
        await click(ACCOUNT);

        assert.dom('.fb-account-language option').doesNotExist();
        assert.dom('.fb-segmented [aria-checked="true"]').doesNotExist();
        assert.ok(find('.fb-account-menu'));
    });
});
