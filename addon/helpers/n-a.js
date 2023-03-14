import { helper } from '@ember/component/helper';

export default helper(function nA([value, fallback = '-']) {
  if (typeof value === 'undefined' || value === null || value === '') {
    return fallback;
  } else {
    return value;
  }
});
