import { modifier } from 'ember-modifier';

/**
 * Sets a CSS custom property on the element, or removes it when the value is
 * null or undefined: `{{set-css-var "--fb-module-color" @entry.color}}`.
 *
 * Templates in this addon may not carry inline styles, so per-item values such
 * as a module's colour reach the stylesheet through a custom property.
 */
export default modifier(function setCssVar(element, [name, value]) {
    if (value === null || value === undefined) {
        element.style.removeProperty(name);
    } else {
        element.style.setProperty(name, value);
    }
});
