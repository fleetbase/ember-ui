export default function isMenuItemActive(slug, view) {
    let path = window.location.pathname;
    let segments = path.replace(/^\/|\/$/g, '').split('/');
    let slugMatch = segments.includes(slug);

    if (view) {
        let viewMatch = segments.includes(view);
        return slugMatch && viewMatch;
    }

    return slugMatch;
}
