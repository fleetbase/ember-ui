import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import Evented from '@ember/object/evented';

class MobileMediaStub extends Service.extend(Evented) {
    isMobile = true;
}

const TRIGGER = '.ember-basic-dropdown-trigger';

function localeLinks() {
    return findAll('.locale-selector-tray-content .next-dd-item');
}

module('Integration | Component | locale-selector-tray', function (hooks) {
    setupRenderingTest(hooks);

    let intl;
    let language;
    let fetch;

    hooks.beforeEach(function () {
        intl = this.owner.lookup('service:intl');
        language = this.owner.lookup('service:language');
        fetch = this.owner.lookup('service:fetch');

        intl.locales = ['en-us', 'fr-fr'];
        intl.primaryLocale = 'en-us';
        language.availableLocales = {
            'en-us': { emoji: '🇺🇸', language: 'English', country: 'United States' },
            'fr-fr': { emoji: '🇫🇷', language: 'French', country: 'France' },
        };
    });

    test('it renders a globe trigger', async function (assert) {
        await render(hbs`<LocaleSelectorTray />`);

        assert.dom('.locale-selector-tray').exists();
        assert.dom(`${TRIGGER} svg`).hasClass('fa-globe');
    });

    test('opening it lists every available locale', async function (assert) {
        await render(hbs`<LocaleSelectorTray />`);
        await click(TRIGGER);

        assert.deepEqual(
            localeLinks().map((link) => link.textContent.replace(/\s+/g, ' ').trim()),
            ['🇺🇸 English', '🇫🇷 French']
        );
    });

    test('the current locale is ticked', async function (assert) {
        await render(hbs`<LocaleSelectorTray />`);
        await click(TRIGGER);

        assert.dom(localeLinks()[0].querySelector('svg')).hasClass('fa-check', 'the active locale is marked');
        assert.strictEqual(localeLinks()[1].querySelector('svg'), null, 'the other locale is not');
    });

    test('choosing a locale switches it and persists the choice', async function (assert) {
        await render(hbs`<LocaleSelectorTray />`);
        await click(TRIGGER);
        await click(localeLinks()[1]);

        assert.strictEqual(intl.primaryLocale, 'fr-fr', 'the intl service is switched');
        assert.deepEqual(
            fetch.calls.filter((call) => call.method === 'post'),
            [{ method: 'post', args: ['users/locale', { locale: 'fr-fr' }, {}] }],
            'the choice is written back to the server'
        );
    });

    test('a locale changed elsewhere re-ticks the list', async function (assert) {
        await render(hbs`<LocaleSelectorTray />`);

        intl.setLocale('fr-fr');
        await click(TRIGGER);

        assert.dom(localeLinks()[1].querySelector('svg')).hasClass('fa-check');
        assert.strictEqual(localeLinks()[0].querySelector('svg'), null);
    });

    test('a spinner is shown while the country list loads', async function (assert) {
        language.loadAvailableCountries = { isRunning: true, isIdle: false, perform: () => Promise.resolve({}) };

        await render(hbs`<LocaleSelectorTray />`);
        await click(TRIGGER);

        assert.dom('.locale-selector-tray-content .fleetbase-loader').exists();
        assert.deepEqual(localeLinks(), [], 'no locales are listed yet');
    });

    test('an empty locale list renders an empty menu', async function (assert) {
        language.availableLocales = {};

        await render(hbs`<LocaleSelectorTray />`);
        await click(TRIGGER);

        assert.deepEqual(localeLinks(), []);
        assert.dom('.locale-selector-tray-content .next-dd-menu').exists();
    });

    test('open and close handlers are forwarded to the dropdown', async function (assert) {
        const events = [];
        this.set('onOpen', () => events.push('open'));
        this.set('onClose', () => events.push('close'));

        await render(hbs`<LocaleSelectorTray @onOpen={{this.onOpen}} @onClose={{this.onClose}} />`);
        await click(TRIGGER);
        await click(TRIGGER);

        assert.deepEqual(events, ['open', 'close']);
    });

    test('class hooks and splattributes are applied', async function (assert) {
        await render(hbs`
            <LocaleSelectorTray @wrapperClass="my-wrapper" @triggerClass="my-trigger" @contentClass="my-content" @dropdownMenuClass="my-menu" data-test-tray="yes" />
        `);
        await click(TRIGGER);

        assert.dom('.locale-selector-tray').hasAttribute('data-test-tray', 'yes');
        assert.dom(TRIGGER).hasClass('my-trigger');
        assert.dom('.locale-selector-tray-content').hasClass('my-content');
        assert.dom('.locale-selector-tray-content .next-dd-menu').hasClass('my-menu');
    });

    test('on a desktop the dropdown uses the standard position calculation', async function (assert) {
        await render(hbs`<LocaleSelectorTray />`);
        await click(TRIGGER);

        const content = find('.ember-basic-dropdown-content');
        assert.dom(content).doesNotHaveClass('is-mobile');
        assert.notStrictEqual(content.style.top, '', 'a vertical position was computed');
    });

    module('on mobile', function (hooks) {
        hooks.beforeEach(function () {
            this.owner.unregister('service:media');
            this.owner.register('service:media', MobileMediaStub);
        });

        test('the dropdown spans the full width below the trigger', async function (assert) {
            await render(hbs`<LocaleSelectorTray />`);
            await click(TRIGGER);

            const content = find('.ember-basic-dropdown-content');
            // ember-basic-dropdown applies left/top/width/padding from the returned style; it has
            // no `right` handling, so the full-bleed sheet is achieved by `width: 100%` alone.
            assert.strictEqual(content.style.left, '0px');
            assert.strictEqual(content.style.width, '100%');
            assert.strictEqual(content.style.padding, '0px 0.5rem');
            assert.notStrictEqual(content.style.top, '', 'the sheet is positioned below the trigger');
        });

        test('the trigger is marked as mobile', async function (assert) {
            await render(hbs`<LocaleSelectorTray />`);

            assert.dom(TRIGGER).hasClass('is-mobile');
        });
    });
});
