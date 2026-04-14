import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { settled } from '@ember/test-helpers';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { A } from '@ember/array';
import EmberObject from '@ember/object';

/*
 * Task 15 — hierarchy-aware context switcher tests.
 *
 * Covers 8 scenarios for the multi-tenant hierarchy switcher added to
 * `<Layout::Header />`:
 *
 *   1. Org user has an "All Clients" entry in contextMenuItems.
 *   2. Org user has each child client entry in contextMenuItems.
 *   3. Client-role user sees NO hierarchy items (contextMenuItems is []).
 *   4. selectContext POSTs `/v1/companies/switch-context` with the UUID.
 *   5. On 200, currentUser.activeCompanyContext is updated.
 *   6. On 403, currentUser.activeCompanyContext is NOT updated and an
 *      error notification is surfaced.
 *   7. `isActive` flag tracks currentUser.activeCompanyContext.
 *   8. `contextMenuItems` returns [] when isOrgRoleUser is false even
 *      if clientCompanies is populated.
 *
 * The tests use a factoryFor(component:layout/header).create() pattern
 * so we can inspect the tracked state and methods directly without
 * needing `BasicDropdown` to be open to find DOM items. All async waits
 * drain via `settled()` before assertion.
 */

const PARENT_UUID = '11111111-aaaa-bbbb-cccc-000000000001';
const CLIENT_A_UUID = '22222222-aaaa-bbbb-cccc-000000000002';
const CLIENT_B_UUID = '33333333-aaaa-bbbb-cccc-000000000003';

/**
 * Build a stub fetch service configurable per-test:
 *   - `clientsResponse`: array OR function returning a Promise
 *     (array is wrapped into `{ clients }`)
 *   - `onPost`: callback invoked for every POST
 *   - `postShouldFail`: if numeric, POSTs reject with that HTTP status
 */
function makeFetchStub({ clientsResponse = [], onPost = null, postShouldFail = null } = {}) {
    return class FetchStub extends Service {
        calls = [];

        get(url) {
            this.calls.push({ method: 'GET', url });
            if (url !== 'v1/companies/clients') {
                return Promise.resolve({});
            }
            if (typeof clientsResponse === 'function') {
                return clientsResponse();
            }
            return Promise.resolve({ clients: clientsResponse });
        }

        post(url, body) {
            this.calls.push({ method: 'POST', url, body });
            if (typeof onPost === 'function') {
                onPost(url, body);
            }
            if (postShouldFail) {
                const err = new Error('forbidden');
                err.status = postShouldFail;
                return Promise.reject(err);
            }
            return Promise.resolve({ company: { uuid: body?.company_uuid } });
        }

        flushRequestCache() {
            /* no-op */
        }
    };
}

/**
 * Stub currentUser exposing only the properties the header touches,
 * plus a real tracked `activeCompanyContext` getter/setter so reactivity
 * is preserved without touching actual localStorage.
 */
class CurrentUserStub extends Service {
    @tracked companyName = 'Acme Org';
    @tracked companyId = PARENT_UUID;
    @tracked email = 'owner@acme.test';
    @tracked roleName = 'Owner';
    @tracked name = 'Owner';
    @tracked avatarUrl = '';
    @tracked isAdmin = false;
    @tracked organizations = A([]);
    @tracked _activeCompanyContext = null;

    get activeCompanyContext() {
        return this._activeCompanyContext;
    }
    set activeCompanyContext(value) {
        this._activeCompanyContext = value && value.length ? value : null;
    }

    getCompany() {
        return EmberObject.create({ id: this.companyId, name: this.companyName });
    }
}

class UniverseStub extends Service {
    organizationMenuItems = [];
    userMenuItems = [];
}

class NotificationsStub extends Service {
    errors = [];
    error(message) {
        this.errors.push(message);
    }
    success() {}
    warning() {}
    serverError() {}
}

class RouterStub extends Service {
    currentRouteName = 'console.home';
    transitionTo() {
        return Promise.resolve();
    }
}

class AbilitiesStub extends Service {
    can() {
        return true;
    }
    cannot() {
        return false;
    }
}

class StoreStub extends Service {
    peekRecord() {
        return null;
    }
    findRecord() {
        return Promise.resolve({});
    }
}

function registerBaseStubs(owner, { FetchClass, clientsResponse, onPost, postShouldFail } = {}) {
    owner.register(
        'service:fetch',
        FetchClass || makeFetchStub({ clientsResponse, onPost, postShouldFail })
    );
    owner.register('service:current-user', CurrentUserStub);
    owner.register('service:universe', UniverseStub);
    owner.register('service:notifications', NotificationsStub);
    owner.register('service:router', RouterStub);
    owner.register('service:host-router', RouterStub);
    owner.register('service:abilities', AbilitiesStub);
    owner.register('service:store', StoreStub);
}

/**
 * Instantiate the header component directly so we can inspect its
 * tracked state and call methods without requiring the BasicDropdown
 * wrapper to be open for DOM queries.
 */
function instantiateHeader(owner) {
    const factory = owner.factoryFor('component:layout/header');
    return factory.create();
}

module('Integration | Component | layout/header (hierarchy context switcher)', function (hooks) {
    setupRenderingTest(hooks);

    test('1. org user has "All Clients" entry in context menu items', async function (assert) {
        registerBaseStubs(this.owner, { clientsResponse: [] });

        const header = instantiateHeader(this.owner);
        await settled();

        const items = header.contextMenuItems;
        const allClients = items.find((i) => i.testSelector === 'all');
        assert.ok(allClients, 'includes an "All Clients" item');
        assert.strictEqual(allClients.text, 'All Clients', 'label is "All Clients"');
        assert.strictEqual(
            allClients.companyUuid,
            PARENT_UUID,
            '"All Clients" targets parent-org UUID (not null, not magic string)'
        );
    });

    test('2. org user sees each child client entry', async function (assert) {
        registerBaseStubs(this.owner, {
            clientsResponse: [
                { uuid: CLIENT_A_UUID, name: 'Alpha Client' },
                { uuid: CLIENT_B_UUID, name: 'Bravo Client' },
            ],
        });

        const header = instantiateHeader(this.owner);
        await settled();

        const items = header.contextMenuItems;
        const uuids = items.map((i) => i.companyUuid).filter(Boolean);
        assert.deepEqual(
            uuids,
            [PARENT_UUID, CLIENT_A_UUID, CLIENT_B_UUID],
            'menu lists parent first, then each child client'
        );
        assert.strictEqual(
            items.find((i) => i.companyUuid === CLIENT_A_UUID)?.text,
            'Alpha Client',
            'client name labeled on its item'
        );
    });

    test('3. client-role user sees NO hierarchy menu', async function (assert) {
        const ForbiddenFetch = makeFetchStub({
            clientsResponse: () => {
                const err = new Error('forbidden');
                err.status = 403;
                return Promise.reject(err);
            },
        });
        registerBaseStubs(this.owner, { FetchClass: ForbiddenFetch });

        const header = instantiateHeader(this.owner);
        await settled();

        assert.notOk(header.isOrgRoleUser, 'flagged as non-org role after 403');
        assert.deepEqual(
            header.contextMenuItems,
            [],
            'contextMenuItems is empty for client-role users'
        );
    });

    test('4. selectContext POSTs /v1/companies/switch-context with the UUID', async function (assert) {
        const recorded = [];
        const FetchClass = makeFetchStub({
            clientsResponse: [{ uuid: CLIENT_A_UUID, name: 'Alpha Client' }],
            onPost: (url, body) => recorded.push({ url, body }),
        });
        registerBaseStubs(this.owner, { FetchClass });

        // Intercept reload — test environment must not actually reload.
        const originalReload = window.location.reload;
        Object.defineProperty(window.location, 'reload', {
            configurable: true,
            value: () => {},
        });

        try {
            const header = instantiateHeader(this.owner);
            await settled();
            await header.selectContext(CLIENT_A_UUID);

            const posts = recorded.filter((c) => c.url === 'v1/companies/switch-context');
            assert.strictEqual(posts.length, 1, 'posted exactly once');
            assert.deepEqual(
                posts[0].body,
                { company_uuid: CLIENT_A_UUID },
                'posted the target client UUID'
            );
        } finally {
            Object.defineProperty(window.location, 'reload', {
                configurable: true,
                value: originalReload,
            });
        }
    });

    test('5. on 200, currentUser.activeCompanyContext is updated', async function (assert) {
        registerBaseStubs(this.owner, {
            clientsResponse: [{ uuid: CLIENT_A_UUID, name: 'Alpha Client' }],
        });

        const originalReload = window.location.reload;
        Object.defineProperty(window.location, 'reload', {
            configurable: true,
            value: () => {},
        });

        try {
            const header = instantiateHeader(this.owner);
            await settled();

            const currentUser = this.owner.lookup('service:current-user');
            currentUser.activeCompanyContext = null;

            await header.selectContext(CLIENT_A_UUID);

            assert.strictEqual(
                currentUser.activeCompanyContext,
                CLIENT_A_UUID,
                'active context updated to selected client UUID'
            );
        } finally {
            Object.defineProperty(window.location, 'reload', {
                configurable: true,
                value: originalReload,
            });
        }
    });

    test('6. on 403, currentUser.activeCompanyContext is NOT updated', async function (assert) {
        const FetchClass = makeFetchStub({
            clientsResponse: [{ uuid: CLIENT_A_UUID, name: 'Alpha Client' }],
            postShouldFail: 403,
        });
        registerBaseStubs(this.owner, { FetchClass });

        const originalReload = window.location.reload;
        let reloadCalled = false;
        Object.defineProperty(window.location, 'reload', {
            configurable: true,
            value: () => {
                reloadCalled = true;
            },
        });

        try {
            const header = instantiateHeader(this.owner);
            await settled();

            const currentUser = this.owner.lookup('service:current-user');
            currentUser.activeCompanyContext = null;

            await header.selectContext(CLIENT_A_UUID);

            assert.strictEqual(
                currentUser.activeCompanyContext,
                null,
                'activeCompanyContext untouched after 403'
            );
            assert.notOk(reloadCalled, 'did not reload on failure');

            const notifications = this.owner.lookup('service:notifications');
            assert.ok(notifications.errors.length >= 1, 'surfaced an error notification');
        } finally {
            Object.defineProperty(window.location, 'reload', {
                configurable: true,
                value: originalReload,
            });
        }
    });

    test('7. isActive flag tracks currentUser.activeCompanyContext', async function (assert) {
        registerBaseStubs(this.owner, {
            clientsResponse: [
                { uuid: CLIENT_A_UUID, name: 'Alpha Client' },
                { uuid: CLIENT_B_UUID, name: 'Bravo Client' },
            ],
        });

        const currentUser = this.owner.lookup('service:current-user');
        currentUser.activeCompanyContext = CLIENT_A_UUID;

        const header = instantiateHeader(this.owner);
        await settled();

        const items = header.contextMenuItems;
        const allClients = items.find((i) => i.testSelector === 'all');
        const alpha = items.find((i) => i.companyUuid === CLIENT_A_UUID);
        const bravo = items.find((i) => i.companyUuid === CLIENT_B_UUID);

        assert.notOk(allClients.isActive, '"All Clients" not active when a client is selected');
        assert.ok(alpha.isActive, 'selected client reports isActive');
        assert.notOk(bravo.isActive, 'other client not active');

        // Null active context => parent/"All Clients" is considered active
        // since the backend resolves null to the user's default (the org).
        currentUser.activeCompanyContext = null;
        const items2 = header.contextMenuItems;
        const allClients2 = items2.find((i) => i.testSelector === 'all');
        assert.ok(
            allClients2.isActive,
            '"All Clients" active when activeCompanyContext is null (parent default)'
        );
    });

    test('8. contextMenuItems returns [] for client-role users', async function (assert) {
        registerBaseStubs(this.owner, { clientsResponse: [] });

        const header = instantiateHeader(this.owner);
        // Force the flag regardless of discovery outcome to verify the
        // getter gates on isOrgRoleUser alone.
        header.isOrgRoleUser = false;
        header.clientCompanies = [{ uuid: CLIENT_A_UUID, name: 'Alpha Client' }];

        assert.deepEqual(
            header.contextMenuItems,
            [],
            'no hierarchy items for client-role users even with clientCompanies set'
        );
    });
});
