import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

/**
 * The playground's own light/dark state.
 *
 * It lives in a service rather than in the host component because the redesign puts the toggle in
 * the application header, which is rendered on the catalog too — where there is no host component
 * at all. Keeping it here means the choice survives navigation between pages instead of resetting
 * every time a component page rebuilds its host.
 *
 * The addon's own components read `[data-theme="dark"]` (see `tailwind.config.js`), so the host
 * stamps this value onto its root element and the previews follow along.
 */
export default class PlaygroundThemeService extends Service {
    /** The addon's host-application theme stub, kept in step so components that read it agree. */
    @service theme;

    @tracked current = 'light';

    get isDark() {
        return this.current === 'dark';
    }

    /** Label for the control that switches to the *other* theme. */
    get toggleLabel() {
        return this.isDark ? 'Light theme' : 'Dark theme';
    }

    get shortToggleLabel() {
        return this.isDark ? 'Light' : 'Dark';
    }

    @action toggle() {
        this.setTheme(this.isDark ? 'light' : 'dark');
    }

    setTheme(theme) {
        this.current = theme;

        if (typeof this.theme?.setTheme === 'function') {
            this.theme.setTheme(theme);
        }
    }
}
