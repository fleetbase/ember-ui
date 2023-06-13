import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { computed } from '@ember/object';
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
    @alias('args.user') user;

    @computed('store', 'user.company_uuid') get company() {
        return this.store.peekRecord('company', this.user.company_uuid);
    }

    @computed('args.{organizations,organizationNavigationItems}', 'organizations.@each.id', 'user.{company_name,email}')
    get organizationNavigationItems() {
        if (isArray(this.args.organizationNavigationItems)) {
            return this.args.organizationNavigationItems;
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
                route: 'console.settings',
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

        return items;
    }

    @computed('args.userNavigationItems') get userNavigationItems() {
        if (isArray(this.args.userNavigationItems)) {
            return this.args.userNavigationItems;
        }

        return [
            {
                route: 'console.account',
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
            {
                route: 'console.developers',
                text: 'Developers',
            },
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
        ];
    }
}
