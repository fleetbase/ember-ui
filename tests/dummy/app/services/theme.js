import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

/**
 * Stub of the host console's `theme` service. Tracks the active theme in memory only.
 */
export default class ThemeService extends Service {
    calls = [];

    @tracked currentTheme = 'light';

    setTheme(theme) {
        this.calls.push({ method: 'setTheme', args: [theme] });
        this.currentTheme = theme;
    }
}
