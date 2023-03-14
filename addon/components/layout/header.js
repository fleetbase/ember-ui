import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { computed } from '@ember/object';
import { action } from '@ember/object';
import { alias } from '@ember/object/computed';
import frontendUrl from '@fleetbase/ember-core/utils/frontend-url';

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

  @computed(
    'args.organizations',
    'organizations.@each.id',
    'user.{company_name,email}'
  )
  get orgNavigationItems() {
    const items = [
      {
        text: [this.user.email, this.user.company_name],
        class:
          'flex flex-row items-center px-3 rounded-md text-gray-800 text-sm dark:text-gray-300 leading-1',
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
        route: 'console',
        text: 'Home',
      },
      {
        route: 'console',
        text: 'Organization settings',
      },
      {
        href: 'javascript:;',
        text: 'Create or join organizations',
        action: 'createOrJoinOrg',
      },
      {
        route: 'console',
        text: 'Billing settings',
      },
      {
        route: 'console',
        text: 'Explore extensions',
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

    return items;
  }

  @tracked userNavigationItems = [
    {
      route: 'console.account',
      text: 'View Profile',
    },
    {
      href: 'javascript:;',
      text: 'Download desktop app',
      disabled: true,
      action: 'downloadDesktopApp',
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
      href: 'https://discord.gg/fjP4sReEvH',
      target: '_discord',
      text: 'Join Discord Community',
    },
    {
      href: 'https://fleetbase.zendesk.com/hc/en-us',
      target: '_support',
      text: 'Help & Support',
    },
    {
      route: 'console',
      text: 'Developers',
    },
    {
      href: frontendUrl('docs/api'),
      target: '_api',
      text: 'API Reference',
      icon: 'external-link',
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
