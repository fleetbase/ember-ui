import Component from '@glimmer/component';
import { action, get } from '@ember/object';

const DEFAULT_STATUS_TONES = {
    active: 'text-green-500',
    available: 'text-green-500',
    online: 'text-green-500',
    connected: 'text-green-500',
    success: 'text-green-500',
    enabled: 'text-green-500',
    equipped: 'text-green-500',
    in_stock: 'text-green-500',
    inStock: 'text-green-500',
    warning: 'text-yellow-500',
    pending: 'text-yellow-500',
    recently_offline: 'text-yellow-500',
    low_stock: 'text-yellow-500',
    lowStock: 'text-yellow-500',
    inactive: 'text-gray-400',
    offline: 'text-gray-400',
    unavailable: 'text-gray-400',
    unequipped: 'text-gray-400',
    never_connected: 'text-gray-400',
    long_offline: 'text-gray-400',
    out_of_stock: 'text-red-500',
    outOfStock: 'text-red-500',
    error: 'text-red-500',
    disabled: 'text-red-500',
};

export default class TableCellResourceIdentityComponent extends Component {
    get row() {
        return this.args.row;
    }

    get column() {
        return this.args.column ?? {};
    }

    get label() {
        if (typeof this.column.labelFormatter === 'function') {
            return this.column.labelFormatter(this.row, this.column);
        }

        if (this.column.labelValue !== undefined) {
            return typeof this.column.labelValue === 'function' ? this.column.labelValue(this.row, this.column) : this.column.labelValue;
        }

        return this.valueFromPathConfig('labelPath', 'valuePath') ?? this.args.value;
    }

    get identifier() {
        return this.valueFromConfig('identifier', 'identifierPath');
    }

    get mediaUrl() {
        return this.valueFromConfig('mediaUrl', 'mediaPath', 'photoPath');
    }

    get fallbackImage() {
        return this.column.fallbackImage ?? this.column.fallbackSrc;
    }

    get altText() {
        return this.valueFromConfig('altText', 'altTextPath') ?? this.label ?? '';
    }

    get status() {
        return this.valueFromConfig('status', 'statusPath');
    }

    get statusLabel() {
        if (typeof this.column.statusFormatter === 'function') {
            return this.column.statusFormatter(this.status, this.row, this.column);
        }

        return this.status;
    }

    get hasStatusDot() {
        return this.column.showStatusDot ?? this.column.showOnlineIndicator ?? true;
    }

    get showStatusBadge() {
        return this.column.showStatusBadge ?? false;
    }

    get statusBadgeWrapperClass() {
        return this.column.statusBadgeWrapperClass ?? 'resource-identity-status-badge';
    }

    get statusBadgeSpanClass() {
        return this.column.statusBadgeSpanClass;
    }

    get statusBadgeIconClass() {
        return this.column.statusBadgeIconClass;
    }

    get statusBadgeIconSize() {
        return this.column.statusBadgeIconSize;
    }

    get statusBadgeSize() {
        return this.column.statusBadgeSize ?? 'xxs';
    }

    get imageSizeClass() {
        return this.column.imageSizeClass ?? 'h-7 w-7';
    }

    get imageRoundedClass() {
        if (this.column.imageRoundedClass) {
            return this.column.imageRoundedClass;
        }

        return this.column.imageRounded ? 'rounded-full' : 'rounded-md';
    }

    get statusToneClass() {
        const value = this.onlineValue ?? this.status;
        const statusToneMap = {
            ...DEFAULT_STATUS_TONES,
            ...(this.column.statusToneMap ?? {}),
        };

        if (typeof this.column.statusToneClass === 'function') {
            return this.column.statusToneClass(value, this.row, this.column);
        }

        if (typeof value === 'boolean') {
            return value ? 'text-green-500' : 'text-yellow-200';
        }

        return statusToneMap[value] ?? statusToneMap[String(value ?? '').toLowerCase()] ?? 'text-gray-400';
    }

    get statusDotClass() {
        return this.statusToneClass;
    }

    get onlineValue() {
        if (typeof this.column.onlinePath === 'string') {
            return get(this.row, this.column.onlinePath);
        }

        return undefined;
    }

    get metaItems() {
        const metaPaths = this.column.metaPaths ?? [];
        const items = metaPaths.map((pathConfig) => this.normalizeMetaItem(pathConfig)).filter((item) => item?.value !== undefined && item?.value !== null && item?.value !== '');
        const uniqueItems = this.uniqueMetaItems(items);

        if (this.identifier) {
            return this.uniqueMetaItems([{ value: this.identifier }, ...uniqueItems]).slice(0, this.column.metaLimit ?? 3);
        }

        return uniqueItems.slice(0, this.column.metaLimit ?? 3);
    }

    get wrapperClass() {
        return this.column.wrapperClass ?? 'max-w-md';
    }

    valueFromConfig(valueKey, pathKey, fallbackPathKey) {
        if (this.column[valueKey] !== undefined) {
            return typeof this.column[valueKey] === 'function' ? this.column[valueKey](this.row, this.column) : this.column[valueKey];
        }

        return this.valueFromPathConfig(pathKey, fallbackPathKey);
    }

    valueFromPathConfig(pathKey, fallbackPathKey) {
        const path = this.column[pathKey] ?? this.column[fallbackPathKey];

        if (typeof path === 'function') {
            return path(this.row, this.column);
        }

        if (typeof path === 'string') {
            return get(this.row, path);
        }

        return undefined;
    }

    normalizeMetaItem(pathConfig) {
        if (typeof pathConfig === 'function') {
            const value = pathConfig(this.row, this.column);

            return typeof value === 'object' ? value : { value };
        }

        if (typeof pathConfig === 'string') {
            return { value: get(this.row, pathConfig) };
        }

        if (typeof pathConfig === 'object' && pathConfig !== null) {
            const value = typeof pathConfig.value === 'function' ? pathConfig.value(this.row, this.column) : (pathConfig.value ?? get(this.row, pathConfig.path));

            return {
                ...pathConfig,
                value: typeof pathConfig.formatter === 'function' ? pathConfig.formatter(value, this.row, this.column) : value,
            };
        }

        return null;
    }

    uniqueMetaItems(items) {
        const seen = new Set();

        return items.filter((item) => {
            const key = String(item.value);

            if (seen.has(key)) {
                return false;
            }

            seen.add(key);

            return true;
        });
    }

    @action onClick(event) {
        const { row, column } = this;
        const { onClick } = this.args;

        if (typeof onClick === 'function') {
            onClick(row, event);
        }

        if (typeof column?.onClick === 'function') {
            column.onClick(row, event);
        }

        if (typeof column?.action === 'function') {
            column.action(row, event);
        }
    }
}
