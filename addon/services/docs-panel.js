import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { getOwner } from '@ember/application';

export const DOCS_BASE_URL = 'https://www.fleetbase.io/docs/';
const OFFICIAL_DOC_HOSTS = ['www.fleetbase.io', 'fleetbase.io', 'docs.fleetbase.io'];
const DOCS_EMBED_SOURCE = 'console';
const SUPPORTED_THEMES = ['light', 'dark'];

export default class DocsPanelService extends Service {
    @tracked isOpen = false;
    @tracked url = null;
    @tracked title = 'Documentation';
    @tracked source = null;
    @tracked iframeFailed = false;
    @tracked isIframeLoading = false;
    @tracked iframeTheme = 'light';

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

    get isIframeThemeDark() {
        return this.iframeTheme === 'dark';
    }

    get bodyWrapperClass() {
        if (this.isIframeThemeDark) {
            return 'fleetbase-docs-panel-body fleetbase-docs-panel-body-dark';
        }

        return 'fleetbase-docs-panel-body fleetbase-docs-panel-body-light';
    }

    @action
    open(url, options = {}) {
        this.iframeTheme = this.resolveTheme(options.theme);
        this.url = this.normalizeUrl(url, { theme: this.iframeTheme });
        this.title = options.title ?? 'Documentation';
        this.source = options.source ?? null;
        this.iframeFailed = false;
        this.isIframeLoading = this.canEmbed;
        this.isOpen = true;
    }

    @action
    close() {
        this.isOpen = false;
        this.isIframeLoading = false;
    }

    @action
    markIframeFailed() {
        this.iframeFailed = true;
        this.isIframeLoading = false;
    }

    @action
    markIframeLoaded() {
        this.isIframeLoading = false;
    }

    @action
    openExternal() {
        if (this.url) {
            window.open(this.url, '_docs');
        }
    }

    normalizeUrl(url, options = {}) {
        const theme = this.sanitizeTheme(options.theme);

        if (!url) {
            return this.withDocsEmbedParams(DOCS_BASE_URL, theme);
        }

        if (url.startsWith('/docs')) {
            return this.withDocsEmbedParams(`https://www.fleetbase.io${url}`, theme);
        }

        if (url.startsWith('docs/')) {
            return this.withDocsEmbedParams(`https://www.fleetbase.io/${url}`, theme);
        }

        if (!/^[a-z][a-z0-9+.-]*:/i.test(url) && !url.startsWith('//')) {
            return this.withDocsEmbedParams(`${DOCS_BASE_URL}${url.replace(/^\/+/, '')}`, theme);
        }

        if (this.isOfficialDocsUrl(url)) {
            return this.withDocsEmbedParams(url, theme);
        }

        return url;
    }

    resolveTheme(theme) {
        const explicitTheme = this.sanitizeTheme(theme);

        if (explicitTheme) {
            return explicitTheme;
        }

        let themeService;

        try {
            const owner = getOwner(this);

            if (owner?.hasRegistration?.('service:theme') === false) {
                return 'light';
            }

            themeService = owner?.lookup?.('service:theme');
        } catch {
            themeService = null;
        }

        return this.sanitizeTheme(themeService?.currentTheme) ?? 'light';
    }

    sanitizeTheme(theme) {
        if (SUPPORTED_THEMES.includes(theme)) {
            return theme;
        }
    }

    isOfficialDocsUrl(url) {
        try {
            const parsed = new URL(url, window.location.origin);
            return OFFICIAL_DOC_HOSTS.includes(parsed.hostname) && (parsed.hostname === 'docs.fleetbase.io' || parsed.pathname.startsWith('/docs'));
        } catch {
            return false;
        }
    }

    withDocsEmbedParams(url, theme) {
        try {
            const parsed = new URL(url, window.location.origin);

            if (!this.isOfficialDocsUrl(parsed.href)) {
                return url;
            }

            parsed.searchParams.set('embed', DOCS_EMBED_SOURCE);

            if (theme) {
                parsed.searchParams.set('theme', theme);
            }

            return parsed.href;
        } catch {
            return url;
        }
    }
}
