import { helper } from '@ember/component/helper';
import { format } from 'date-fns';

export default helper(function dateFormat([dateInstance, fmt]) {
  return format(dateInstance, fmt);
});
