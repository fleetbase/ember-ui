import { modifier } from 'ember-modifier';

export default modifier(function setHeight(element, [height]) {
  if (!height) {
    return;
  }

  element.style.height = height;
});
