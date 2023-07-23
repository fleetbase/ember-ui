import window from 'ember-window-mock';

export default function isMenuItemActive(section, slug, view) {
    let path = window.location.pathname;
    let segments = path.replace(/^\/|\/$/g, '').split('/');
    let sectionMatch = segments[0] === section;
    let slugMatch = segments.includes(slug);
    let viewMatch = segments.includes(view);

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
