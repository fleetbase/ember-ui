import Component from '@glimmer/component';
import { action } from '@ember/object';
import { categories } from 'dummy/playground/registry';

/**
 * The searchable, categorized catalog of documented components.
 *
 * Search and category live in the URL (see `controllers/components`), so a filtered catalog is a
 * linkable thing rather than transient local state.
 */
export default class PlaygroundCatalogComponent extends Component {
    get categories() {
        return categories();
    }

    get query() {
        return (this.args.query ?? '').trim().toLowerCase();
    }

    get activeCategory() {
        return this.args.category ?? '';
    }

    /** Entries matching the current search and category, grouped by category for display. */
    get groups() {
        const query = this.query;
        const category = this.activeCategory;

        const matches = this.args.entries.filter((entry) => {
            if (category && entry.category !== category) {
                return false;
            }

            if (!query) {
                return true;
            }

            // Display name and slug, as documented — not description, so results stay predictable.
            return entry.name.toLowerCase().includes(query) || entry.slug.toLowerCase().includes(query);
        });

        return this.categories.map((name) => ({ name, slug: anchorSlug(name), entries: matches.filter((entry) => entry.category === name) })).filter((group) => group.entries.length > 0);
    }

    get matchCount() {
        return this.groups.reduce((total, group) => total + group.entries.length, 0);
    }

    @action onSearch(event) {
        this.args.onSearch(event.target.value);
    }

    @action onCategory(event) {
        this.args.onCategory(event.target.value);
    }
}

/**
 * Category names become anchor ids for the jump-to rail:
 * "Layout & Structure" -> "layout-structure".
 */
function anchorSlug(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}
