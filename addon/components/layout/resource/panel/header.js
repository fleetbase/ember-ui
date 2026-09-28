import Component from '@glimmer/component';

// The `modelName` getter that used to live here was a byte-identical duplicate of the one in
// `header-actions.js`, and header.hbs never read it. `@modelName` is now forwarded to
// HeaderActions instead, so there is exactly one implementation and it is the one that decides
// the save button's label.
export default class LayoutResourcePanelHeaderComponent extends Component {}
