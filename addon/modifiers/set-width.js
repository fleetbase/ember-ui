import { modifier } from 'ember-modifier';

export default modifier(function setWidth(element, [width]) {
    if (!width) {
        return;
    }

    element.style.width = width;
});
