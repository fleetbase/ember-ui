import { modifier } from 'ember-modifier';
import numbersOnly from '../utils/numbers-only';

export default modifier(function setHeight(element, [height], { calculated = false }) {
    if (height === undefined || height === null) return;

    if (calculated) {
        element.style.height = height;
        return;
    }

    let heightValue = height;
    let unit = '';

    // Check if height is a string with a unit
    if (typeof height === 'string') {
        const match = height.match(/^(\d+(?:\.\d+)?)(\D+)?$/);
        if (match !== null) {
            heightValue = match[1];
            unit = match[2] || '';
        } else {
            // A keyword like `auto`, `none` or `fit-content` has no numeric part, so the
            // numbersOnly() line below would reduce it to the invalid string "px" and the browser
            // would drop it. Apply it verbatim instead.
            element.style.height = height;
            return;
        }
    }

    // A unit this modifier cannot convert (%, vh, vw, ch, …) used to be parsed off and then
    // thrown away, so `100%` silently became `100px`. Honour it as written instead.
    if (!['', 'px', 'em', 'rem', 'pt', 'pc'].includes(unit)) {
        element.style.height = height;
        return;
    }

    // Convert the height value to pixels
    if (unit === 'em') {
        heightValue *= 16; // 1em = 16px
    } else if (unit === 'rem') {
        heightValue *= 16; // 1rem = 16px (assuming default font size of 16px)
    } else if (unit === 'pt') {
        heightValue *= 1.33; // 1pt = 1.33px (assuming 96dpi)
    } else if (unit === 'pc') {
        heightValue *= 16; // 1pc = 16px (assuming 12pt = 16px)
    }

    // Set the height of the element by the value
    element.style.height = `${numbersOnly(heightValue)}px`;
});
