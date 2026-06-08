import Service from '@ember/service';
import { inject as service } from '@ember/service';

export default class SidebarNavigatorService extends Service {
    @service router;
    @service abilities;

    normalizeItems(items = []) {
        if (!Array.isArray(items)) {
            return [];
        }

        return items
            .filter((item) => this.isVisible(item))
            .map((item) => {
                return {
                    ...item,
                    children: this.normalizeItems(item.children ?? []),
                };
            });
    }

    isVisible(item = {}) {
        if (!item || item.visible === false) {
            return false;
        }

        if (item.permission) {
            try {
                return this.abilities.can(item.permission);
            } catch (_) {
                return true;
            }
        }

        return true;
    }

    flattenItems(items = [], trail = []) {
        return items.flatMap((item) => {
            const path = [...trail, item];

            return [{ item, path }, ...this.flattenItems(item.children ?? [], path)];
        });
    }

    searchItems(items = [], query = '') {
        const needle = query.trim().toLowerCase();

        if (!needle) {
            return [];
        }

        return this.flattenItems(items).filter(({ item, path }) => {
            const haystack = [item.label, item.title, item.description, item.route, item.url, ...(item.keywords ?? []), ...path.map((pathItem) => pathItem.label ?? pathItem.title)]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(needle);
        });
    }

    activePath(items = [], routeName = this.router.currentRouteName, currentURL = this.router.currentURL) {
        for (const item of items) {
            const childPath = this.activePath(item.children ?? [], routeName, currentURL);

            if (childPath.length) {
                return [item, ...childPath];
            }

            if (this.isActive(item, routeName, currentURL)) {
                return [item];
            }
        }

        return [];
    }

    isActive(item = {}, routeName = this.router.currentRouteName, currentURL = this.router.currentURL) {
        if (item.route && routeName?.startsWith(item.route)) {
            return true;
        }

        if (item.url && currentURL === item.url) {
            return true;
        }

        return false;
    }

    breadcrumb(path = []) {
        return path
            .map((item) => item.label ?? item.title)
            .filter(Boolean)
            .join(' > ');
    }
}
