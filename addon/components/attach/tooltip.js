import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { computed } from '@ember/object';

export default class AttachTooltipComponent extends Component {
  @computed('args.placement') get placement() {
    const { placement } = this.args;

    if (typeof placement === 'string') {
      return placement;
    }

    return 'right';
  }
}
