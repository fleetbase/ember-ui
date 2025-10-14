import { modifier } from 'ember-modifier';

export default modifier(function setZIndex(element, [zIndex]) {
    element.style.zIndex = zIndex;
});
