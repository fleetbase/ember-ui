import window from 'ember-window-mock';
import getUrlParam from './get-url-param';

export default function isMenuItemActive(section, slug, view = null) {
    let path = window.location.pathname;
    let segments = path.replace(/^\/|\/$/g, '').split('/');
    // Hack for now for fleet-ops until we can refactor the menu system to be more route-aware and not rely on URL parsing
    if (segments.length === 3 && segments[0] === 'fleet-ops') {
        segments = segments.slice(1);
    }
    let sectionMatch = segments[0] === section;
    let slugOnly = segments[0] === slug && section === slug && view === null;
    let slugMatch = segments.includes(slug);
    let viewMatch = segments.includes(view) || getUrlParam('view') === view;

    // `slugOnly` already requires `view === null`, so a `slugOnly && view` branch could never
    // run; a caller that passes a view falls through to the section rules below.
    if (slugOnly) {
        return slugMatch;
    }

    if (section && view) {
        return sectionMatch && slugMatch && viewMatch;
    }

    if (section) {
        return sectionMatch && slugMatch;
    }

    if (view) {
        return slugMatch && viewMatch;
    }

    return slugMatch;
}
