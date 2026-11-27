import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export const DOCK_PREFERENCES_KEY = 'dock-preferences';

export const DOCK_PREFERENCE_DEFAULTS = Object.freeze({
    showBadges: true,
    openOnHover: false,
    pinRail: false,
    position: 'left',
    size: 'default',
});

const CHOICES = Object.freeze({
    position: ['left', 'right', 'auto-hide'],
    size: ['default', 'compact'],
});

/**
 * One user's dock behaviour toggles (the "Behaviour" column of the dock
 * customizer). Which modules sit in the dock, in what order, and which are
 * locked belong to ember-core's `dock` service; these are only how the dock
 * behaves, so they live with the component and persist as a user option.
 */
export default class DockPreferencesService extends Service {
    @service currentUser;

    @tracked showBadges = DOCK_PREFERENCE_DEFAULTS.showBadges;
    @tracked openOnHover = DOCK_PREFERENCE_DEFAULTS.openOnHover;
    @tracked pinRail = DOCK_PREFERENCE_DEFAULTS.pinRail;
    @tracked position = DOCK_PREFERENCE_DEFAULTS.position;
    @tracked size = DOCK_PREFERENCE_DEFAULTS.size;

    constructor() {
        super(...arguments);
        this.load();
    }

    /**
     * Reads the saved preferences, ignoring unknown keys and invalid values.
     */
    load() {
        const saved = this.currentUser.getOption(DOCK_PREFERENCES_KEY, {}) || {};
        for (const key of Object.keys(DOCK_PREFERENCE_DEFAULTS)) {
            if (this.isValid(key, saved[key])) {
                this[key] = saved[key];
            }
        }
    }

    isValid(key, value) {
        if (CHOICES[key]) {
            return CHOICES[key].includes(value);
        }

        return typeof value === 'boolean' && key in DOCK_PREFERENCE_DEFAULTS;
    }

    /**
     * Sets one preference and saves them all. Unknown keys and invalid values
     * are ignored.
     */
    update(key, value) {
        if (!this.isValid(key, value)) {
            return;
        }

        this[key] = value;
        this.currentUser.setOption(DOCK_PREFERENCES_KEY, this.toJSON());
    }

    toggle(key) {
        this.update(key, !this[key]);
    }

    reset() {
        for (const [key, value] of Object.entries(DOCK_PREFERENCE_DEFAULTS)) {
            this[key] = value;
        }
        this.currentUser.setOption(DOCK_PREFERENCES_KEY, this.toJSON());
    }

    toJSON() {
        return {
            showBadges: this.showBadges,
            openOnHover: this.openOnHover,
            pinRail: this.pinRail,
            position: this.position,
            size: this.size,
        };
    }
}
