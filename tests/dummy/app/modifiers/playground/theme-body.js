import { modifier } from 'ember-modifier';

/**
 * Mirror the playground's theme onto <body>.
 *
 * The addon's theming is not written against "any ancestor" — 1094 of its rules are scoped to
 * `body[data-theme='dark']` / `body[data-theme='light']` specifically. Setting the attribute on the
 * playground's own container themes the playground chrome and leaves every previewed component in
 * its light colours, which in dark mode meant near-black text on a dark surface.
 *
 * A real console sets this on <body>, so the playground — which is the host application — does the
 * same. The previous value is restored on teardown so nothing leaks between tests.
 */
export default modifier(function themeBody(element, [theme]) {
    if (typeof document === 'undefined') {
        return;
    }

    const { body } = document;
    const previous = body.getAttribute('data-theme');

    body.setAttribute('data-theme', theme ?? 'light');

    return () => {
        if (previous === null) {
            body.removeAttribute('data-theme');
        } else {
            body.setAttribute('data-theme', previous);
        }
    };
});
