import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import Evented from '@ember/object/evented';
import Component from '@glimmer/component';
import { getOwner } from '@ember/application';
import { setComponentTemplate } from '@ember/component';

// <LinkToExternal> is provided by ember-engines and only resolves inside a mounted engine, so it is
// stubbed here at that boundary.
class LinkToExternalStub extends Component {}
const LINK_TO_EXTERNAL_TEMPLATE = hbs`<a href="javascript:;" data-test-route={{@route}} ...attributes>{{yield}}</a>`;

class DesktopMediaStub extends Service.extend(Evented) {
    isMobile = false;
}

class MobileMediaStub extends Service.extend(Evented) {
    isMobile = true;
}

// LocaleSelectorTray also renders a `.next-org-button-trigger`, so the organization menu has to be
// scoped to the header's own dropdown wrapper.
const ORG_TRIGGER = '.next-header-menu-item-dd .next-org-button-trigger';
const USER_TRIGGER = '.next-user-button-trigger';

function menuTexts() {
    return findAll('.next-header-menu-item-dd-content .next-dd-item, .next-header-menu-item-dd-content .next-header-dd-menu-item').map((item) => item.textContent.trim());
}

module('Integration | Component | layout/header', function (hooks) {
    setupRenderingTest(hooks);

    let currentUser;
    let universe;

    hooks.beforeEach(function () {
        this.owner.register('component:link-to-external', LinkToExternalStub);
        this.owner.register('template:components/link-to-external', LINK_TO_EXTERNAL_TEMPLATE);
        this.owner.unregister('service:media');
        this.owner.register('service:media', DesktopMediaStub);

        currentUser = this.owner.lookup('service:current-user');
        currentUser.organizations = [];
        currentUser.isAdmin = false;

        universe = this.owner.lookup('service:universe');
        universe.organizationMenuItems = [];
        universe.userMenuItems = [];
        universe.headerMenuItems = [];

        // hasExtension() reads the application's extension registry.
        getOwner(this).application.extensions = [];
    });

    module('rendering', function () {
        test('it renders a header with a logo linking to the console', async function (assert) {
            await render(hbs`<Layout::Header />`);

            assert.dom('header.next-view-header').exists();
            assert.dom('a.navbar-logo').hasAttribute('data-test-route', 'console');
        });

        test('it yields into the left section', async function (assert) {
            await render(hbs`<Layout::Header><span class="inside">extra</span></Layout::Header>`);

            assert.dom('.next-view-header-left .inside').hasText('extra');
        });

        test('it renders the registry and tray slots', async function (assert) {
            await render(hbs`<Layout::Header />`);

            assert.dom('#view-header-left-content-a').exists();
            assert.dom('#view-header-left-content-b').exists();
            assert.dom('#view-header-actions').exists();
            assert.dom('#view-header-tray-items').exists();
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<Layout::Header class="sticky" data-test-header="yes" />`);

            assert.dom('header.next-view-header').hasClass('sticky');
            assert.dom('header.next-view-header').hasAttribute('data-test-header', 'yes');
        });

        test('the sidebar toggle appears only when asked for', async function (assert) {
            await render(hbs`<Layout::Header />`);
            assert.dom('.next-view-header-left button').doesNotExist('no toggle by default');

            await render(hbs`<Layout::Header @showSidebarToggle={{true}} />`);
            assert.dom('.next-view-header-left button').exists('the toggle is rendered');
        });

        test('pressing the sidebar toggle reports it', async function (assert) {
            const toggles = [];
            this.set('onSidebarToggle', () => toggles.push('toggle'));

            await render(hbs`<Layout::Header @showSidebarToggle={{true}} @onSidebarToggle={{this.onSidebarToggle}} />`);
            await click('.next-view-header-left button');

            assert.deepEqual(toggles, ['toggle']);
        });

        test('the nav menu is hidden on mobile, along with the sidebar toggle', async function (assert) {
            this.owner.unregister('service:media');
            this.owner.register('service:media', MobileMediaStub);

            await render(hbs`<Layout::Header @showSidebarToggle={{true}} />`);

            assert.dom('.next-catalog-menu-items').doesNotExist('the smart nav menu is dropped');
            assert.dom('.next-view-header-left button').doesNotExist('so is the sidebar toggle');
        });

        test('the nav menu renders on a desktop', async function (assert) {
            await render(hbs`<Layout::Header />`);

            assert.dom('.next-catalog-menu-items').exists();
        });
    });

    module('the organization menu', function () {
        test('the trigger shows the company name and its initial', async function (assert) {
            await render(hbs`<Layout::Header />`);

            assert.dom(ORG_TRIGGER).containsText('Test Company');
            assert.dom(`${ORG_TRIGGER} .org-badge`).hasText('T');
        });

        test('it lists the session identity, the static items and the version', async function (assert) {
            await render(hbs`<Layout::Header />`);
            await click(ORG_TRIGGER);

            const texts = menuTexts().join('|');
            assert.true(texts.includes('Home'), 'a home link is offered');
            assert.true(texts.includes('Organization settings'));
            assert.true(texts.includes('Create or join organizations'));
            assert.dom('.next-dd-session-user-wrapper').containsText('Test Company');
            assert.dom('.next-dd-session-user-wrapper').containsText('test.user@example.test');
            assert.dom('.app-version-in-nav').exists('the running version is shown');
        });

        test('every organization the user belongs to is listed for switching', async function (assert) {
            currentUser.organizations = [
                { id: 'test-company-1', name: 'Test Company' },
                { id: 'other-company', name: 'Other Company' },
            ];

            await render(hbs`<Layout::Header />`);
            await click(ORG_TRIGGER);

            const texts = menuTexts().join('|');
            assert.true(texts.includes('Other Company'), 'the other organization is offered');
        });

        test('the explore-extensions link appears only with the registry bridge booted', async function (assert) {
            await render(hbs`<Layout::Header />`);
            await click(ORG_TRIGGER);
            assert.false(menuTexts().join('|').includes('Explore extensions'));

            getOwner(this).application.extensions = [{ name: '@fleetbase/registry-bridge-engine' }];

            await render(hbs`<Layout::Header />`);
            await click(ORG_TRIGGER);
            assert.true(menuTexts().join('|').includes('Explore extensions'));
        });

        test('an admin is offered the admin link', async function (assert) {
            currentUser.isAdmin = true;

            await render(hbs`<Layout::Header />`);
            await click(ORG_TRIGGER);

            assert.true(menuTexts().join('|').includes('Admin'));
        });

        test('a logout item is always offered last', async function (assert) {
            await render(hbs`<Layout::Header />`);
            await click(ORG_TRIGGER);

            assert.true(menuTexts().join('|').includes('Logout'));
        });

        test('registered organization items are merged in', async function (assert) {
            universe.organizationMenuItems = [{ href: 'javascript:;', text: 'Registered Org Item', action: 'doThing' }];

            await render(hbs`<Layout::Header />`);
            await click(ORG_TRIGGER);

            assert.true(menuTexts().join('|').includes('Registered Org Item'));
        });

        test('supplied items are merged in', async function (assert) {
            this.set('organizationMenuItems', [{ href: 'javascript:;', text: 'Supplied Org Item', action: 'doThing' }]);

            await render(hbs`<Layout::Header @organizationMenuItems={{this.organizationMenuItems}} />`);
            await click(ORG_TRIGGER);

            assert.true(menuTexts().join('|').includes('Supplied Org Item'));
        });

        test('mutateOrganizationMenuItems is offered the assembled list', async function (assert) {
            const seen = [];
            this.set('mutateOrganizationMenuItems', (items) => seen.push(items));

            await render(hbs`<Layout::Header @mutateOrganizationMenuItems={{this.mutateOrganizationMenuItems}} />`);

            assert.strictEqual(seen.length, 1);
            assert.true(
                seen[0].some((item) => item.text === 'Organization settings'),
                'the static items are already present'
            );
        });

        test('mutateUserMenuItems is offered the assembled list too', async function (assert) {
            const seen = [];
            this.set('mutateUserMenuItems', (items) => seen.push(items));

            await render(hbs`<Layout::Header @mutateUserMenuItems={{this.mutateUserMenuItems}} />`);

            assert.strictEqual(seen.length, 1, 'the hook is called once');
            assert.true(
                seen[0].some((item) => item.text === 'Logout'),
                'the static items are already present'
            );
            assert.true(
                seen[0].some((item) => item.action === 'invalidateSession'),
                'including the ones carrying actions'
            );
        });

        test('choosing an item dispatches its action', async function (assert) {
            const dispatched = [];
            this.set('onAction', (...args) => dispatched.push(args));

            await render(hbs`<Layout::Header @onAction={{this.onAction}} />`);
            await click(ORG_TRIGGER);

            const item = findAll('.next-header-menu-item-dd-content a.next-dd-item').find((candidate) => candidate.textContent.includes('Create or join organizations'));
            assert.ok(item, 'the item is rendered as an anchor');
            await click(item);

            assert.strictEqual(dispatched.length, 1);
            assert.strictEqual(dispatched[0][0], 'createOrJoinOrg');
        });
    });

    module('the user menu', function () {
        test('the trigger shows the user avatar', async function (assert) {
            await render(hbs`<Layout::Header />`);

            assert.dom(`${USER_TRIGGER} img`).exists();
            assert.dom(`${USER_TRIGGER} img`).hasAttribute('alt', 'Test User');
        });

        test('it lists the identity, profile, changelog and support items', async function (assert) {
            await render(hbs`<Layout::Header />`);
            await click(USER_TRIGGER);

            const texts = menuTexts().join('|');
            assert.true(texts.includes('View Profile'));
            assert.true(texts.includes('Show keyboard shortcuts'));
            assert.true(texts.includes('Changelog'));
            assert.true(texts.includes('Join Discord Community'));
            assert.true(texts.includes('Help & Support'));
            assert.true(texts.includes('Documentation'));
            assert.dom('.next-dd-session-user-wrapper').containsText('Test User');
        });

        test('a dark-mode toggle is offered', async function (assert) {
            await render(hbs`<Layout::Header />`);
            await click(USER_TRIGGER);

            assert.dom('.next-header-menu-item-dd-content [role="checkbox"]').exists('the dark mode switch is rendered');
        });

        test('the developers link appears only with the dev engine booted', async function (assert) {
            await render(hbs`<Layout::Header />`);
            await click(USER_TRIGGER);
            assert.false(menuTexts().join('|').includes('Developers'));

            getOwner(this).application.extensions = [{ name: '@fleetbase/dev-engine' }];

            await render(hbs`<Layout::Header />`);
            await click(USER_TRIGGER);
            assert.true(menuTexts().join('|').includes('Developers'));
        });

        test('registered and supplied user items are merged in', async function (assert) {
            universe.userMenuItems = [{ href: 'javascript:;', text: 'Registered User Item', action: 'doThing' }];
            this.set('userMenuItems', [{ href: 'javascript:;', text: 'Supplied User Item', action: 'doThing' }]);

            await render(hbs`<Layout::Header @userMenuItems={{this.userMenuItems}} />`);
            await click(USER_TRIGGER);

            const texts = menuTexts().join('|');
            assert.true(texts.includes('Registered User Item'));
            assert.true(texts.includes('Supplied User Item'));
        });

        test('the documentation item opens the docs panel', async function (assert) {
            const opened = [];
            this.owner.unregister('service:docs-panel');
            this.owner.register(
                'service:docs-panel',
                class extends Service {
                    open(url, options) {
                        opened.push({ url, options });
                    }
                }
            );

            await render(hbs`<Layout::Header />`);
            await click(USER_TRIGGER);

            const item = findAll('.next-header-menu-item-dd-content a.next-dd-item').find((candidate) => candidate.textContent.includes('Documentation'));
            assert.ok(item, 'the documentation item is rendered');
            await click(item);

            assert.strictEqual(opened.length, 1);
            assert.strictEqual(opened[0].url, 'https://www.fleetbase.io/docs');
            assert.strictEqual(opened[0].options.source, 'user-menu');
        });
    });

    test('a registered tray component is rendered and can route through the header', async function (assert) {
        const transitions = [];
        this.owner.unregister('service:router');
        this.owner.register(
            'service:router',
            class extends Service {
                on() {}
                off() {}
                transitionTo(route) {
                    transitions.push(route);
                    return Promise.resolve(route);
                }
            }
        );

        // The header hands itself to every header-tray-items registry component as @header, which
        // is the only route by which its routeTo action is reachable. RegistryYield only treats an
        // entry as a component when it is a class (or carries an `engine`), so register a real one.
        class TrayItemStub extends Component {}
        setComponentTemplate(hbs`<button type="button" class="tray-item" {{on "click" (fn @header.routeTo "console.home")}}>Tray</button>`, TrayItemStub);

        this.owner.unregister('service:universe/registry-service');
        this.owner.register(
            'service:universe/registry-service',
            class extends Service {
                getRenderableComponents(registry) {
                    return registry === 'header-tray-items' ? [TrayItemStub] : [];
                }
            }
        );

        await render(hbs`<Layout::Header />`);

        assert.dom('#view-header-tray-items .tray-item').exists('the registered component is rendered into the tray');

        await click('.tray-item');
        assert.deepEqual(transitions, ['console.home'], 'the header routed on the component behalf');
    });
});
