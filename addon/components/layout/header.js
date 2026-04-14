import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import { getOwner } from '@ember/application';
import config from 'ember-get-config';

/**
 * Layout header component.
 *
 * @export
 * @class LayoutHeaderComponent
 * @extends {Component}
 */
export default class LayoutHeaderComponent extends Component {
    @service store;
    @service router;
    @service hostRouter;
    @service universe;
    @service currentUser;
    @service abilities;
    @service fetch;
    @service notifications;
    @tracked company;
    @tracked organizationMenuItems = [];
    @tracked userMenuItems = [];
    @tracked extensions = [];

    /**
     * Multi-tenant hierarchy: list of child client companies for the
     * current org, loaded asynchronously from `/v1/companies/clients`.
     * Empty (and hierarchy items suppressed) when the user is a
     * client-role user (endpoint returns 403) or when no clients exist.
     *
     * @var {Array}
     */
    @tracked clientCompanies = [];

    /**
     * True while we are still discovering whether the user is org-role
     * or client-role via the initial `/v1/companies/clients` request.
     * While true we suppress hierarchy items to avoid a UI flash.
     *
     * @var {Boolean}
     */
    @tracked hierarchyDiscoveryPending = true;

    /**
     * True when the backend confirms the user is an org-role user
     * (org-side `/v1/companies/clients` returned 200). Client-role
     * users (403 response) see no hierarchy switcher UI.
     *
     * @var {Boolean}
     */
    @tracked isOrgRoleUser = false;

    constructor(owner, { organizationMenuItems = [], userMenuItems = [] }) {
        super(...arguments);
        this.extensions = getOwner(this).application.extensions ?? [];
        this.company = this.currentUser.getCompany();
        this.organizationMenuItems = this.mergeOrganizationMenuItems(organizationMenuItems);
        this.userMenuItems = this.mergeUserMenuItems(userMenuItems);

        // Kick off hierarchy discovery — this resolves after construction
        // and rebuilds `organizationMenuItems` once we know whether this
        // is an org-role user and which clients they have.
        this.discoverHierarchy(organizationMenuItems);
    }

    /**
     * Fetches the list of child client companies for the current org.
     * On 200: flags user as org-role and rebuilds the menu with
     * hierarchy entries. On 403: treats user as client-role and leaves
     * the menu unchanged (no hierarchy UI). On any other error: swallows
     * silently and leaves the existing menu intact — the classic org
     * switcher still works as a fallback.
     */
    async discoverHierarchy(initialOrganizationMenuItems = []) {
        try {
            const response = await this.fetch.get('v1/companies/clients');
            const clients = (response && response.clients) || [];
            this.clientCompanies = clients;
            this.isOrgRoleUser = true;
            this.organizationMenuItems = this.mergeOrganizationMenuItems(initialOrganizationMenuItems);
        } catch (error) {
            const status = error?.status ?? error?.response?.status;
            if (status === 403) {
                this.isOrgRoleUser = false;
            }
            // Any other failure: stay silent; user keeps the legacy menu.
        } finally {
            this.hierarchyDiscoveryPending = false;
        }
    }

    /**
     * Selects a new active company context.
     *
     * Flow:
     *   1. POST `/v1/companies/switch-context` with the target UUID to
     *      have the backend validate pivot access. This is the single
     *      validation oracle for company switching.
     *   2. On success (200): update `currentUser.activeCompanyContext`
     *      (Task 14 setter persists to localStorage and triggers a
     *      header refresh on the next fetch) and reload the page so
     *      engines re-hydrate against the new context.
     *   3. On failure: show a notification, leave state untouched.
     *
     * "All Clients" selection semantics: despite the label, this must
     * resolve to the parent org's UUID — NOT null, NOT a magic string.
     * Single-company-per-request is the contract.
     *
     * @param {String} companyUuid The target company UUID to activate.
     */
    @action async selectContext(companyUuid) {
        if (!companyUuid) {
            return;
        }

        try {
            await this.fetch.post('v1/companies/switch-context', { company_uuid: companyUuid });

            // Persist via the Task 14 setter (writes to localStorage).
            this.currentUser.activeCompanyContext = companyUuid;

            // Flush cached org list so a subsequent refresh sees fresh data.
            if (typeof this.fetch.flushRequestCache === 'function') {
                this.fetch.flushRequestCache('auth/organizations');
            }

            // Full-page reload lets every engine re-hydrate cleanly
            // against the new X-Company-Context header.
            window.location.reload();
        } catch (error) {
            const status = error?.status ?? error?.response?.status;
            const message =
                status === 403
                    ? 'You do not have access to this company.'
                    : 'Could not switch company context. Please try again.';
            if (this.notifications && typeof this.notifications.error === 'function') {
                this.notifications.error(message);
            } else {
                console.error('[layout/header] switch-context failed:', error);
            }
            // Intentionally do NOT mutate currentUser.activeCompanyContext on failure.
        }
    }

    mergeOrganizationMenuItems(organizationMenuItems = []) {
        // Prepare menuItems
        const menuItems = [
            {
                text: [
                    this.currentUser.companyName,
                    this.currentUser.email,
                    { component: 'badge', disableHumanize: true, text: this.currentUser.roleName, status: 'info', hideStatusDot: false, wrapperClass: 'mt-1' },
                ],
                class: 'flex flex-row items-center px-3 rounded-md text-gray-800 text-sm dark:text-gray-300 leading-1',
                wrapperClass: 'next-dd-session-user-wrapper',
            },
        ];

        // List available organizations for session switching
        const organizations = this.currentUser.organizations;
        if (organizations.length) {
            menuItems.pushObject({ seperator: true });
        }
        for (let i = 0; i < organizations.length; i++) {
            const organization = organizations.objectAt(i);
            const organizationMenuItem = {
                href: 'javascript:;',
                text: organization.name,
                action: 'switchOrganization',
                params: [organization],
            };

            // If current organization
            if (this.currentUser.companyId === organization.id) {
                organizationMenuItem.icon = 'check';
                organizationMenuItem.disabled = true;
                organizationMenuItem.action = undefined;
            }

            menuItems.pushObject(organizationMenuItem);
        }

        // Multi-tenant hierarchy: for org-role users we offer an in-org
        // context switcher (parent org + each child client). These items
        // route through `selectContext` directly — they do NOT go through
        // the console controller's `onAction` handler (which fires the
        // legacy `auth/switch-organization` modal flow). Client-role
        // users see no hierarchy UI per the architectural contract.
        if (this.isOrgRoleUser) {
            const hierarchyItems = this.buildHierarchyMenuItems();
            if (hierarchyItems.length) {
                menuItems.pushObject({ seperator: true });
                menuItems.pushObjects(hierarchyItems);
            }
        }

        // Push static menu items
        const staticMenuItems = [
            {
                seperator: true,
            },
            {
                id: 'console-home',
                route: 'console.home',
                text: 'Home',
                icon: 'house',
            },
            {
                id: 'organization-settings',
                route: 'console.settings.index',
                text: 'Organization settings',
                icon: 'gear',
            },
            {
                id: 'create-or-join-organizations',
                href: 'javascript:;',
                text: 'Create or join organizations',
                action: 'createOrJoinOrg',
                icon: 'building',
            },
        ];

        // If registry bridge is booted add to static items
        if (this.hasExtension('@fleetbase/registry-bridge-engine')) {
            staticMenuItems.pushObject({
                id: 'explore-extensions',
                route: 'console.extensions',
                text: 'Explore extensions',
                icon: 'puzzle-piece',
            });
        }

        // Push static items
        menuItems.pushObjects(staticMenuItems);

        // Merge provided menu items
        menuItems.pushObjects(organizationMenuItems);

        // Push items from universe registry
        const universeOrganizationItems = this.universe.organizationMenuItems;
        if (isArray(universeOrganizationItems) && universeOrganizationItems.length) {
            menuItems.pushObjects([
                {
                    seperator: true,
                },
                ...universeOrganizationItems,
                {
                    seperator: true,
                },
            ]);
        }

        // Push the version
        menuItems.pushObject({
            id: 'app-version',
            route: null,
            text: `v${config.version}`,
            icon: 'code-branch',
            iconSize: 'xs',
            iconClass: 'mr-1.5',
            wrapperClass: 'app-version-in-nav',
            overwriteWrapperClass: true,
        });

        // Merge admin link
        if (this.currentUser.isAdmin) {
            menuItems.pushObjects([
                {
                    seperator: true,
                },
                {
                    route: 'console.admin',
                    text: 'Admin',
                    icon: 'toolbox',
                },
            ]);
        }

        // Merge logout link
        menuItems.pushObjects([
            {
                seperator: true,
            },
            {
                href: 'javascript:;',
                text: 'Logout',
                action: 'invalidateSession',
                icon: 'person-running',
            },
        ]);

        // Callback to allow mutation of menu items
        if (typeof this.args.mutateOrganizationMenuItems === 'function') {
            this.args.mutateOrganizationMenuItems(menuItems);
        }

        return menuItems;
    }

    mergeUserMenuItems(userMenuItems = []) {
        // Prepare menu items
        const menuItems = [
            {
                text: [this.currentUser.name, { component: 'badge', disableHumanize: true, text: this.currentUser.roleName, status: 'info', hideStatusDot: false, wrapperClass: 'mt-1' }],
                class: 'flex flex-row items-center px-3 rounded-md text-gray-800 text-sm dark:text-gray-300 leading-1',
                wrapperClass: 'next-dd-session-user-wrapper',
            },
            {
                seperator: true,
            },
            {
                id: 'view-profile-user-nav-item',
                wrapperClass: 'view-profile-user-nav-item',
                route: 'console.account.index',
                text: 'View Profile',
            },
            {
                id: 'show-keyboard-shortcuts-user-nav-item',
                wrapperClass: 'show-keyboard-shortcuts-user-nav-item',
                href: 'javascript:;',
                text: 'Show keyboard shortcuts',
                disabled: true,
                action: 'showKeyboardShortcuts',
            },
            {
                seperator: true,
            },
            {
                id: 'changelog-user-nav-item',
                wrapperClass: 'changelog-user-nav-item',
                href: 'javascript:;',
                text: 'Changelog',
                action: 'viewChangelog',
            },
        ];

        // Add developer menu item if booted
        if (this.hasExtension('@fleetbase/dev-engine')) {
            menuItems.pushObject({
                id: 'developers-user-nav-item',
                wrapperClass: 'developers-user-nav-item',
                route: 'console.developers',
                text: 'Developers',
            });
        }

        // Add more static menu items
        const supportMenuItems = [
            {
                id: 'discord',
                href: 'https://discord.gg/MJQgxHwN',
                target: '_discord',
                text: 'Join Discord Community',
                icon: 'arrow-up-right-from-square',
            },
            {
                id: 'support-user-nav-item',
                wrapperClass: 'support-user-nav-item',
                href: 'https://github.com/fleetbase/fleetbase/issues',
                target: '_support',
                text: 'Help & Support',
                icon: 'arrow-up-right-from-square',
            },
            {
                id: 'docs-user-nav-item',
                wrapperClass: 'docs-user-nav-item',
                href: 'https://docs.fleetbase.io',
                target: '_docs',
                text: 'Documentation',
                icon: 'arrow-up-right-from-square',
            },
        ];

        // Push support menu items
        menuItems.pushObjects(supportMenuItems);

        // Push items from universe registry
        const universeUserMenuItems = this.universe.userMenuItems;
        if (isArray(universeUserMenuItems) && universeUserMenuItems.length) {
            menuItems.pushObjects([
                {
                    seperator: true,
                },
                ...universeUserMenuItems,
                {
                    seperator: true,
                },
            ]);
        }

        // Push provided menu items
        menuItems.pushObjects(userMenuItems);

        // Create immutable static menu items
        menuItems.pushObjects([
            {
                component: 'layout/header/dark-mode-toggle',
            },
            {
                seperator: true,
            },
            {
                href: 'javascript:;',
                text: 'Logout',
                action: 'invalidateSession',
                icon: 'person-running',
            },
        ]);

        // Callback to allow mutation of menu items
        if (typeof this.args.mutateUserMenuItems === 'function') {
            this.args.mutateUserMenuItems(menuItems);
        }

        return menuItems;
    }

    /**
     * Builds the hierarchy-aware context switcher items (parent org
     * "All Clients" entry + one entry per child client company).
     *
     * Design notes:
     *   - "All Clients" sets the active context to the parent org's
     *     UUID (NOT null, NOT a magic string). On a freshly-logged-in
     *     org user whose default company IS the org, this behaves
     *     identically to no header, but the explicit UUID is more
     *     honest and survives edge cases.
     *   - Each item is an interactive dropdown item — it wires
     *     `onClick` directly to `this.selectContext`, bypassing the
     *     console controller's string-keyed `onAction` routing. That
     *     keeps the validate-then-persist-then-reload flow co-located
     *     with the Task 14 state and the switch-context endpoint.
     *   - `isActive` reflects `currentUser.activeCompanyContext`, with
     *     a null active context treated as "parent org selected" since
     *     Auth::getCompany() on the backend resolves null to the user's
     *     default company.
     *
     * @return {Array} Menu items ready to push into the dropdown.
     */
    buildHierarchyMenuItems() {
        const items = [];
        const parentUuid = this.currentUser.companyId;
        if (!parentUuid) {
            return items;
        }

        const activeContext = this.currentUser.activeCompanyContext;
        // Parent-org is "active" either when the header is explicitly the
        // parent UUID, OR when it is null (backend resolves to default company).
        const parentIsActive = activeContext === parentUuid || activeContext === null;

        items.push({
            text: 'All Clients',
            wrapperClass: 'multi-tenant-context-item multi-tenant-context-all-clients',
            testSelector: 'all',
            onClick: () => this.selectContext(parentUuid),
            icon: parentIsActive ? 'check' : undefined,
            disabled: parentIsActive,
            companyUuid: parentUuid,
            isActive: parentIsActive,
        });

        const clients = isArray(this.clientCompanies) ? this.clientCompanies : [];
        for (const client of clients) {
            const uuid = client?.uuid ?? client?.id;
            if (!uuid) {
                continue;
            }
            const isActive = activeContext === uuid;
            items.push({
                text: client.name,
                wrapperClass: 'multi-tenant-context-item',
                testSelector: uuid,
                onClick: () => this.selectContext(uuid),
                icon: isActive ? 'check' : undefined,
                disabled: isActive,
                companyUuid: uuid,
                isActive,
            });
        }

        return items;
    }

    /**
     * Exposed for unit-level tests: returns the hierarchy items that
     * would be injected into the organization menu for the current
     * user. Returns `[]` for client-role users (no hierarchy UI).
     *
     * @return {Array}
     */
    get contextMenuItems() {
        if (!this.isOrgRoleUser) {
            return [];
        }
        return this.buildHierarchyMenuItems();
    }

    @action routeTo(route) {
        const router = this.router ?? this.hostRouter;

        return router.transitionTo(route);
    }

    hasExtension(extensionName) {
        return this.extensions.find(({ name }) => name === extensionName) !== undefined;
    }
}
