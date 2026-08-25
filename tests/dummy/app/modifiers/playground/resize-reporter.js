import { modifier } from 'ember-modifier';

/**
 * Report the embed's rendered height to the parent page, so a documentation site can size its
 * iframe to the content.
 *
 * Deliberately one-way. The playground posts height updates and nothing else, and installs no
 * incoming `message` handler — an embedded page that listens to its parent is a much larger
 * trust surface than this feature needs.
 *
 * The parent listens for:
 *
 *     { type: 'fleetbase:ember-ui-playground:resize', slug: 'button', height: 420 }
 */
export default modifier(function resizeReporter(element, _positional, { slug }) {
    if (typeof window === 'undefined') {
        return;
    }

    // Posted unconditionally rather than only when framed. When the playground is not inside an
    // iframe `window.parent` is the page itself, which installs no `message` listener, so the
    // message is inert — and the behaviour is then identical in every environment, which is what
    // makes it testable rather than dependent on how the test runner happens to host the page.
    let lastHeight = -1;

    const report = () => {
        const height = Math.ceil(element.getBoundingClientRect().height);

        // Only speak when the number actually changed; a ResizeObserver can fire on sub-pixel noise.
        if (height === lastHeight || height === 0) {
            return;
        }

        lastHeight = height;

        // '*' is correct here: the playground does not know which documentation origin has framed
        // it, and the payload is a single non-sensitive integer.
        window.parent.postMessage({ type: 'fleetbase:ember-ui-playground:resize', slug, height }, '*');
    };

    report();

    if (typeof ResizeObserver === 'undefined') {
        return;
    }

    const observer = new ResizeObserver(report);

    observer.observe(element);

    return () => observer.disconnect();
});
