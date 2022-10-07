import Component from '@glimmer/component';
import { computed } from '@ember/object';
import { bool } from '@ember/object/computed';

export default class LayoutHeaderDropdownItemComponent extends Component {
  @bool('args.item.href') isAnchor;
  @bool('args.item.route') isLink;
  @bool('args.item.component') isComponent;
  @bool('args.item.seperator') isSeperator;

  @computed(
    'args.item.text',
    'isAnchor',
    'isLink',
    'isComponent',
    'isSeperator'
  )
  get isTextOnly() {
    const { isAnchor, isLink, isComponent, isSeperator } = this;
    const { text } = this.args.item;

    return (
      [isAnchor, isLink, isComponent, isSeperator].every(
        (prop) => prop === false
      ) && text
    );
  }
}
