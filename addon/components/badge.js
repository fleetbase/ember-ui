import Component from '@glimmer/component';

const BADGE_SIZE_CLASS = {
    xxs: 'status-badge-xxs',
    xs: 'status-badge-xs',
    sm: 'status-badge-sm',
    lg: 'status-badge-lg',
};

const BADGE_ICON_SIZE = {
    xxs: '2xs',
    xs: 'xs',
    sm: 'xs',
    lg: 'sm',
};

export default class BadgeComponent extends Component {
    get sizeClass() {
        return BADGE_SIZE_CLASS[this.args.size];
    }

    get iconSize() {
        return this.args.iconSize ?? BADGE_ICON_SIZE[this.args.size] ?? 'xs';
    }
}
