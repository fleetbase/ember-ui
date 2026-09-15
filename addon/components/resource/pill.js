import Component from '@glimmer/component';
import { action } from '@ember/object';
import { getOwner } from '@ember/application';
import { getResourceDescriptor, resolveResourceKey, canOpenResource, openResource, resourceComponentName } from '../../utils/resource-registry';
import { unwrapRecord, resourceTitle, resourceIdentifier, resourceImage, resourceOnline } from '../../utils/resource-identity';

/**
 * A pill driven by the resource registry: the descriptor supplies the image
 * (or an icon tile), the title, the identifier subtitle and the online dot,
 * and the pill opens the resource on click when the descriptor knows how.
 * With no open path it renders the static, non-link variant. Hovering shows
 * the resource's summary card unless `@noPopover` is set.
 */
export default class ResourcePillComponent extends Component {
    get owner() {
        return getOwner(this);
    }

    get record() {
        return unwrapRecord(this.args.resource);
    }

    /**
     * The record's own type wins; `@resourceType` names the type of a record
     * that does not resolve by itself (a POJO, or a polymorphic base whose
     * concrete subtype is unknown here).
     */
    get key() {
        return resolveResourceKey(this.owner, this.record) ?? resolveResourceKey(this.owner, this.args.resourceType);
    }

    get descriptor() {
        return getResourceDescriptor(this.owner, this.key);
    }

    get title() {
        if (this.args.title !== undefined && this.args.title !== null) {
            return this.args.title;
        }

        return resourceTitle(this.descriptor, this.record, this.args.titleFallback ?? '-');
    }

    get subtitle() {
        if (this.args.subtitle !== undefined) {
            return this.args.subtitle;
        }

        return resourceIdentifier(this.descriptor, this.record);
    }

    get image() {
        return resourceImage(this.descriptor, this.record, {
            url: this.args.imageSrc,
            fallback: this.args.imageFallback,
            shape: this.args.imageShape,
            icon: this.args.icon,
        });
    }

    get online() {
        if (this.args.online !== undefined) {
            return this.args.online;
        }

        return resourceOnline(this.descriptor, this.record);
    }

    get showOnlineIndicator() {
        if (this.args.showOnlineIndicator !== undefined) {
            return Boolean(this.args.showOnlineIndicator);
        }

        return typeof this.online === 'boolean';
    }

    get canOpen() {
        return Boolean(this.record) && canOpenResource(this.owner, this.record, { resourceType: this.args.resourceType });
    }

    get clickHandler() {
        if (typeof this.args.onClick === 'function') {
            return this.args.onClick;
        }

        if (this.args.static || !this.canOpen) {
            return undefined;
        }

        return this.open;
    }

    get showPopover() {
        return !this.args.noPopover && Boolean(this.record) && Boolean(resourceComponentName(this.owner, 'summary', this.key));
    }

    @action open(resource, event) {
        event?.preventDefault?.();

        return openResource(this.owner, this.args.resource, { event, resourceType: this.args.resourceType });
    }
}
