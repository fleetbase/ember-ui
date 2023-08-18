import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { computed, action } from '@ember/object';
import { alias } from '@ember/object/computed';
import { isArray } from '@ember/array';

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
    @alias('args.user') user;

    @computed('store', 'user.company_uuid') get company() {
        return this.store.peekRecord('company', this.user.company_uuid);
    }

    @computed('args.{organizationNavigationItems,organizations.length}', 'organizations.@each.id', 'universe.organizationMenuItems', 'user.{company_name,email}')
    get organizationNavigationItems() {
        const universeOrganizationItems = this.universe.organizationMenuItems;

        if (isArray(this.args.organizationNavigationItems)) {
            const items = this.args.organizationNavigationItems;

            if (universeOrganizationItems) {
                for (let i = 0; i < universeOrganizationItems.length; i++) {
                    const menuItem = universeOrganizationItems[i];
                    menuItem.text = menuItem.title;
                    items.insertAt(menuItem.index, menuItem);
                }
            }
        }

        const items = [
            {
                text: [this.user.email, this.user.company_name],
                class: 'flex flex-row items-center px-3 rounded-md text-gray-800 text-sm dark:text-gray-300 leading-1',
                wrapperClass: 'next-dd-session-user-wrapper',
            },
            {
                seperator: true,
            },
        ];

        this.args.organizations?.forEach((organization) => {
            items.pushObject({
                href: 'javascript:;',
                text: organization.name,
                action: 'switchOrganization',
                params: [organization],
            });
        });

        items.pushObjects([
            {
                seperator: true,
            },
            {
                route: 'console.home',
                text: 'Home',
                icon: 'house',
            },
            {
                route: 'console.settings.index',
                text: 'Organization settings',
                icon: 'gear',
            },
            {
                href: 'javascript:;',
                text: 'Create or join organizations',
                action: 'createOrJoinOrg',
                icon: 'building',
            },
            {
                route: 'console.extensions',
                text: 'Explore extensions',
                icon: 'puzzle-piece',
            },
        ]);

        if (this.user.get('is_admin')) {
            items.pushObjects([
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

        items.pushObjects([
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

        if (universeOrganizationItems) {
            const preIndex = (this.args.organizations?.length ?? 0) + 3;
            for (let i = 0; i < universeOrganizationItems.length; i++) {
                const menuItem = universeOrganizationItems[i];
                menuItem.text = menuItem.title;
                items.insertAt(preIndex + menuItem.index, menuItem);
            }
        }

        return items;
    }

    @computed('args.{userNavigationItems,extensions}', 'universe.userMenuItems') get userNavigationItems() {
        const universeUserMenuItems = this.universe.userMenuItems;

        if (isArray(this.args.userNavigationItems)) {
            const items = this.args.userNavigationItems;

            if (universeUserMenuItems) {
                for (let i = 0; i < universeUserMenuItems.length; i++) {
                    const menuItem = universeUserMenuItems[i];
                    menuItem.text = menuItem.title;
                    items.insertAt(menuItem.index, menuItem);
                }
            }

            return items;
        }

        const items = [
            {
                route: 'console.account.index',
                text: 'View Profile',
            },
            {
                href: 'javascript:;',
                text: 'Show keyboard shortcuts',
                disabled: true,
                action: 'showKeyboardShortcuts',
            },
            {
                seperator: true,
            },
            {
                href: 'javascript:;',
                text: 'Changelog',
                disabled: true,
                action: 'viewChangelog',
            },
        ];

        if (this.hasExtension('@fleetbase/dev-engine')) {
            items.pushObject({
                route: 'console.developers',
                text: 'Developers',
            });
        }

        items.pushObjects([
            {
                href: 'https://discord.gg/MJQgxHwN',
                target: '_discord',
                text: 'Join Discord Community',
                icon: 'arrow-up-right-from-square',
            },
            {
                href: 'https://github.com/fleetbase/fleetbase/issues',
                target: '_support',
                text: 'Help & Support',
                icon: 'arrow-up-right-from-square',
            },
            {
                href: 'https://fleetbase.github.io/api-reference/',
                target: '_api',
                text: 'API Reference',
                icon: 'arrow-up-right-from-square',
            },
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
            },
        ]);

        if (universeUserMenuItems) {
            for (let i = 0; i < universeUserMenuItems.length; i++) {
                const menuItem = universeUserMenuItems[i];
                menuItem.text = menuItem.title;
                items.insertAt(menuItem.index, menuItem);
            }
        }

        return items;
    }

    @action routeTo(route) {
        const router = this.router ?? this.hostRouter;

        return router.transitionTo(route);
    }

    hasExtension(extensionName) {
        const { extensions } = this.args;
        return extensions.find(({ name }) => name === extensionName);
    }
}
