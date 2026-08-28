import { modifier } from 'ember-modifier';

/**
 * Focus the catalog search on ⌘K / Ctrl+K.
 *
 * The design shows a `⌘ K` affordance in the search field, and an affordance for a shortcut that
 * does nothing is worse than none — so the shortcut is wired rather than the hint faked.
 *
 * The listener is added and removed with the catalog, so it exists only on `/components`. The
 * addon's own sidebar navigator binds the same chord, but it is never rendered on that route, so
 * the two cannot both be listening at once.
 */
export default modifier(function searchShortcut(element, _positional, { selector }) {
    if (typeof document === 'undefined') {
        return;
    }

    const onKeydown = (event) => {
        if (event.key?.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) {
            return;
        }

        const input = element.querySelector(selector);

        if (!input) {
            return;
        }

        event.preventDefault();
        input.focus();
        input.select?.();
    };

    document.addEventListener('keydown', onKeydown);

    return () => document.removeEventListener('keydown', onKeydown);
});
