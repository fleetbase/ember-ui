import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

const OFFICIAL_DOC_HOSTS = ['www.fleetbase.io', 'fleetbase.io', 'docs.fleetbase.io'];

export default class DocsPanelService extends Service {
    @tracked isOpen = false;
    @tracked url = null;
    @tracked title = 'Documentation';
    @tracked source = null;
    @tracked iframeFailed = false;

    get canEmbed() {
        if (!this.url) {
            return false;
        }

        try {
            const parsed = new URL(this.url, window.location.origin);
            return OFFICIAL_DOC_HOSTS.includes(parsed.hostname) && (parsed.hostname === 'docs.fleetbase.io' || parsed.pathname.startsWith('/docs'));
        } catch {
            return false;
        }
    }

    @action
    open(url, options = {}) {
        this.url = this.normalizeUrl(url);
        this.title = options.title ?? 'Documentation';
        this.source = options.source ?? null;
        this.iframeFailed = false;
        this.isOpen = true;
    }

    @action
    close() {
        this.isOpen = false;
    }

    @action
    markIframeFailed() {
        this.iframeFailed = true;
    }

    @action
    openExternal() {
        if (this.url) {
            window.open(this.url, '_docs');
        }
    }

    normalizeUrl(url) {
        if (!url) {
            return 'https://www.fleetbase.io/docs';
        }

        if (url.startsWith('/docs')) {
            return `https://www.fleetbase.io${url}`;
        }

        if (url.startsWith('docs/')) {
            return `https://www.fleetbase.io/${url}`;
        }

        return url;
    }
}
