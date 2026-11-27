import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { initials, modifierKeyLabel } from '../../utils/shell';

export const THEMES = Object.freeze([
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'Auto' },
]);

/**
 * `Layout::TopBar` — the canvas shell's top-right tray: search trigger, the
 * existing `NotificationTray` and `ChatTray`, an environment chip, the
 * organization switcher and the account menu (language, time zone, theme).
 *
 * It keeps the classic header's `#view-header-actions` and
 * `#view-header-tray-items` mount points, and renders
 * `RegistryYield @registry="header-tray-items"` inside the tray, so extensions
 * that add tray items keep working.
 *
 * Arguments:
 * - `@environment` — label for the environment chip (no chip without it);
 *   `@environmentTone` is `ok` (default), `warn` or `info`.
 * - `@onAction(name, ...params)` — the same callback the classic header's menus
 *   use, called with `switchOrganization`, `createOrJoinOrg`,
 *   `showKeyboardShortcuts`, `viewChangelog`, `changeTimezone` and
 *   `invalidateSession`.
 * - `@registerNotificationTrayApi`, `@onClickNotification` — passed to the
 *   notification tray.
 * - `@timezones` — the time zones offered (defaults to the browser's list).
 */
export default class LayoutTopBarComponent extends Component {
    @service currentUser;
    @service commandPalette;
    @service language;
    @service theme;
    @service docsPanel;

    get searchShortcut() {
        return `${modifierKeyLabel()}K`;
    }

    get environmentTone() {
        return this.args.environmentTone || 'ok';
    }

    get companyInitial() {
        return initials(this.currentUser.companyName).charAt(0);
    }

    get userInitials() {
        return initials(this.currentUser.name);
    }

    get organizationItems() {
        const organizations = [...(this.currentUser.organizations || [])];
        const items = organizations.map((organization) => {
            const isCurrent = organization.id === this.currentUser.companyId;
            return {
                label: organization.name,
                checked: isCurrent,
                disabled: isCurrent,
                action: () => this.runAction('switchOrganization', organization),
            };
        });

        if (items.length) {
            items.push({ separator: true });
        }

        items.push({ label: 'Organization settings', route: 'console.settings.index' }, { label: 'Create or join organizations', action: () => this.runAction('createOrJoinOrg') });

        return items;
    }

    get languages() {
        return this.language.languages || [];
    }

    get currentLocale() {
        return this.language.currentLocale;
    }

    get timezones() {
        const timezones = this.args.timezones || Intl.supportedValuesOf('timeZone');
        const current = this.currentTimezone;
        return timezones.includes(current) ? timezones : [current, ...timezones];
    }

    get currentTimezone() {
        return this.currentUser.getOption('timezone') || this.currentUser.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    get themes() {
        return THEMES;
    }

    get currentTheme() {
        return this.currentUser.getOption('theme-mode') || this.theme.activeTheme;
    }

    runAction(name, ...params) {
        if (typeof this.args.onAction === 'function') {
            return this.args.onAction(name, ...params);
        }
    }

    @action openSearch() {
        this.commandPalette.open();
    }

    @action changeLanguage(event) {
        this.language.changeLocale(event.target.value);
    }

    @action changeTimezone(event) {
        const timezone = event.target.value;
        this.currentUser.setOption('timezone', timezone);
        this.runAction('changeTimezone', timezone);
    }

    /**
     * Light and Dark set the theme. Auto follows the operating system's colour
     * scheme now and is remembered as the person's choice.
     */
    @action changeTheme(value) {
        this.currentUser.setOption('theme-mode', value);
        if (value === 'system') {
            this.theme.setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        } else {
            this.theme.setTheme(value);
        }
    }

    @action openDocs(menu) {
        menu.close();
        this.docsPanel.open('https://www.fleetbase.io/docs', { title: 'Fleetbase Documentation', source: 'account-menu' });
    }

    @action menuAction(menu, name) {
        menu.close();
        this.runAction(name);
    }
}
