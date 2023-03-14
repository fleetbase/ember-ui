import { modifier } from 'ember-modifier';
import { later } from '@ember/runloop';
import numbersOnly from '../utils/numbers-only';

export default modifier(function increaseHeightBy(element, [increaseBy]) {
  if (increaseBy === undefined || increaseBy === null) {
    return;
  }

  later(
    this,
    () => {
      const { offsetHeight } = element;

      element.style.height = `${offsetHeight + numbersOnly(increaseBy)}px`;
    },
    600
  );
});
