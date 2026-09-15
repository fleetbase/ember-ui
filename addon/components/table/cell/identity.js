import Component from '@glimmer/component';
import { action, get } from '@ember/object';
import { getOwner } from '@ember/application';
import { inject as service } from '@ember/service';
import { getResourceDescriptor, resolveResourceKey, canOpenResource, openResource, resourceComponentName } from '../../../utils/resource-registry';
import { unwrapRecord, resourceTitle, resourceImage, resourceOnline, resourceStatus, resourceBadges, statusToneClass } from '../../../utils/resource-identity';

/**
 * A one-line identity cell driven by the resource registry: a small image
 * or icon with the status dot, the name, and up to `column.badgeLimit`
 * inline badges from the descriptor. Clicking runs `@onClick`, then
 * `column.onClick`, then `column.action`, and otherwise opens the resource
 * through its descriptor. Hovering shows the resource's summary card.
 *
 * There is never a status badge: the dot carries the status. The old
 * `compact`, `showStatusBadge` and `showStatus` column keys are accepted and
 * ignored so existing column definitions keep working.
 */
export default class TableCellIdentityComponent extends Component {
    @service abilities;

    get owner() {
        return getOwner(this);
    }

    get column() {
        return this.args.column ?? {};
    }

    get row() {
        return this.args.row;
    }

    get resource() {
        const { resourcePath } = this.column;
        let resource;

        if (typeof resourcePath === 'function') {
            resource = resourcePath(this.args.row, this.args.value, this.column);
        } else if (typeof resourcePath === 'string') {
            resource = get(this.args.row ?? {}, resourcePath);
        } else if (this.args.value && typeof this.args.value === 'object') {
            resource = this.args.value;
        } else {
            resource = this.args.row;
        }

        return unwrapRecord(resource) ?? null;
    }

    get resourceType() {
        return this.column.resourceType ?? this.args.resourceType;
    }

    /** The record's own type wins; the column or wrapper type is the fallback. */
    get key() {
        return resolveResourceKey(this.owner, this.resource) ?? resolveResourceKey(this.owner, this.resourceType);
    }

    get descriptor() {
        return getResourceDescriptor(this.owner, this.key);
    }

    get emptyText() {
        return this.column.emptyText ?? '-';
    }

    get label() {
        const { labelFormatter, labelValue, labelPath } = this.column;

        if (typeof labelFormatter === 'function') {
            return labelFormatter(this.resource, this.column, this.row);
        }

        if (labelValue !== undefined) {
            return typeof labelValue === 'function' ? labelValue(this.resource, this.column, this.row) : labelValue;
        }

        if (typeof labelPath === 'function') {
            return labelPath(this.resource, this.column, this.row);
        }

        if (typeof labelPath === 'string') {
            return get(this.resource, labelPath) ?? resourceTitle(this.descriptor, this.resource, null);
        }

        return resourceTitle(this.descriptor, this.resource, null);
    }

    get image() {
        const image = resourceImage(this.descriptor, this.resource, {
            url: typeof this.column.mediaPath === 'string' ? get(this.resource, this.column.mediaPath) : undefined,
            fallback: this.column.fallbackImage ?? this.column.fallbackSrc,
        });

        if (!image.url && !image.icon && !image.component) {
            image.icon = this.descriptor?.icon ?? 'cube';
        }

        return image;
    }

    get hasStatusDot() {
        return this.column.showStatusDot ?? this.column.showOnlineIndicator ?? true;
    }

    get statusValue() {
        if (typeof this.column.onlinePath === 'string') {
            const online = get(this.resource, this.column.onlinePath);

            if (online !== undefined && online !== null) {
                return online;
            }
        }

        if (typeof this.column.statusPath === 'string') {
            return get(this.resource, this.column.statusPath);
        }

        if (typeof this.column.statusPath === 'function') {
            return this.column.statusPath(this.resource, this.column, this.row);
        }

        const online = resourceOnline(this.descriptor, this.resource);

        if (online !== undefined && online !== null) {
            return online;
        }

        return resourceStatus(this.descriptor, this.resource);
    }

    get statusDotClass() {
        const value = this.statusValue;

        if (typeof this.column.statusToneClass === 'function') {
            return this.column.statusToneClass(value, this.resource, this.column);
        }

        return statusToneClass(value, { ...(this.descriptor?.statusTones ?? {}), ...(this.column.statusToneMap ?? {}) });
    }

    get badges() {
        const { badges, hideBadges, badgeLimit } = this.column;

        if (hideBadges) {
            return [];
        }

        const selfId = get(this.row ?? {}, 'id') ?? get(this.row ?? {}, 'uuid') ?? null;
        let list;

        if (typeof badges === 'function') {
            list = badges(this.resource, this.row, this.column) ?? [];
        } else if (Array.isArray(badges)) {
            list = badges;
        } else {
            list = resourceBadges(this.descriptor, this.resource, { row: this.row, column: this.column, selfId });
        }

        return list.filter(Boolean).slice(0, badgeLimit ?? 2);
    }

    get isDisabled() {
        const { permission } = this.column;

        if (!permission) {
            return false;
        }

        try {
            return this.abilities.cannot(permission);
        } catch {
            return false;
        }
    }

    get hasHandler() {
        return typeof this.args.onClick === 'function' || typeof this.column.onClick === 'function' || typeof this.column.action === 'function';
    }

    get hasOpenPath() {
        return this.hasHandler || canOpenResource(this.owner, this.resource, { resourceType: this.resourceType });
    }

    get showPopover() {
        return this.column.popover !== false && Boolean(resourceComponentName(this.owner, 'summary', this.key));
    }

    get wrapperClass() {
        return this.column.wrapperClass ?? 'max-w-md';
    }

    @action onClick(event) {
        const { column } = this;
        const { onClick } = this.args;
        const resource = this.resource;
        let handled = false;

        if (typeof onClick === 'function') {
            onClick(resource, event);
            handled = true;
        }

        if (typeof column.onClick === 'function') {
            column.onClick(resource, event);
            handled = true;
        }

        if (typeof column.action === 'function') {
            column.action(resource, event);
            handled = true;
        }

        if (!handled) {
            openResource(this.owner, resource, { event, resourceType: this.resourceType });
            handled = true;
        }

        event?.stopPropagation?.();
    }
}
