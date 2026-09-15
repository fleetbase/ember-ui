import Component from '@glimmer/component';
import { getOwner } from '@ember/application';
import { getResourceDescriptor } from '../../utils/resource-registry';
import { unwrapRecord, resourceTitle, resourceImage, resourceSelectDetails } from '../../utils/resource-identity';

/**
 * One option in a ModelSelect or PowerSelect: a photo or icon, a title, and
 * a line of detail beneath it. Given `@option` (or `@model`), the descriptor
 * registered for the record fills these in; the presentational arguments
 * (`@photo`, `@fallbackPhoto`, `@icon`, `@title`, `@details`, `@shape`)
 * override it. `@compact` puts everything on one line at a smaller photo,
 * for a select's closed trigger.
 */
export default class ResourceSelectOptionComponent extends Component {
    get owner() {
        return getOwner(this);
    }

    get record() {
        return unwrapRecord(this.args.option ?? this.args.model);
    }

    get descriptor() {
        return getResourceDescriptor(this.owner, this.args.resourceType ?? this.record);
    }

    get title() {
        if (this.args.title !== undefined && this.args.title !== null) {
            return this.args.title;
        }

        return resourceTitle(this.descriptor, this.record, this.args.titleFallback ?? '-');
    }

    get details() {
        const details = this.args.details ?? resourceSelectDetails(this.descriptor, this.record);

        return (Array.isArray(details) ? details : [details]).filter((detail) => detail !== null && detail !== undefined && String(detail).trim() !== '').join(' · ');
    }

    get image() {
        return resourceImage(this.descriptor, this.record, {
            url: this.args.photo,
            fallback: this.args.fallbackPhoto,
            shape: this.args.shape,
            icon: this.args.icon,
        });
    }

    get photo() {
        return this.image.url || this.image.fallback || null;
    }

    get icon() {
        if (this.image.icon) {
            return this.image.icon;
        }

        if (!this.photo && this.descriptor) {
            return this.descriptor.icon;
        }

        return null;
    }
}
