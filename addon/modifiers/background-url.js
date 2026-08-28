/* eslint-disable no-empty-pattern */
import { modifier } from 'ember-modifier';

/* istanbul ignore next -- Glimmer always passes both the positional and named arguments to a
   helper, so this parameter default can never be reached from a template. */
export default modifier(function backgroundUrl(element, [url], modifierOptions = {}) {
    const options = {
        overlay: false,
        gradient: 'linear-gradient(0deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3))',
        size: 'cover',
        ...modifierOptions,
    };
    //{ url, overlay: false, gradient: 'linear-gradient(0deg, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3))', size: 'cover' }
    const hasUrl = typeof url === 'string' && url.trim().length > 0;
    element.style.background = !hasUrl ? '' : options.overlay ? `${options.gradient}, url('${url}')` : `url('${url}')`;
    element.style.backgroundSize = options.size;
});
