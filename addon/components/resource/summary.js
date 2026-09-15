import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { getOwner } from '@ember/application';
import { task } from 'ember-concurrency';
import { getResourceDescriptor, canOpenResource, openResource, readDescriptor } from '../../utils/resource-registry';
import { unwrapRecord, resourceTitle, resourceIdentifier, resourceImage, resourceOnline, resourceStatus, resourceFacts, makeTranslator } from '../../utils/resource-identity';

/**
 * The compact summary card shown when a resource is hovered: image or icon,
 * title and identifier, status and online state, a few key facts, and one
 * View action. Hydration runs only when the card is inserted, so a table
 * costs nothing until a row is actually paused on; while it runs the facts
 * show as skeleton bars, and a failed hydrate falls back to what the record
 * already carries.
 */
export default class ResourceSummaryComponent extends Component {
    @tracked hydrated = null;
    @tracked hydrateFailed = false;

    translate = makeTranslator(getOwner(this));

    get owner() {
        return getOwner(this);
    }

    get record() {
        return this.hydrated ?? unwrapRecord(this.args.resource);
    }

    get descriptor() {
        return getResourceDescriptor(this.owner, this.args.resourceType ?? this.record ?? this.args.resource);
    }

    get title() {
        return resourceTitle(this.descriptor, this.record, this.args.titleFallback ?? '-');
    }

    get identifier() {
        return resourceIdentifier(this.descriptor, this.record);
    }

    get image() {
        const image = resourceImage(this.descriptor, this.record);

        if (!image.url && !image.icon && !image.component) {
            image.icon = readDescriptor(this.descriptor, 'icon') ?? 'cube';
        }

        return image;
    }

    get online() {
        return resourceOnline(this.descriptor, this.record);
    }

    get hasOnline() {
        return typeof this.online === 'boolean';
    }

    get status() {
        const status = resourceStatus(this.descriptor, this.record);

        return status === undefined || status === null || status === '' ? null : status;
    }

    get facts() {
        return resourceFacts(this.owner, this.descriptor, this.record, { translate: this.translate });
    }

    get canOpen() {
        return canOpenResource(this.owner, this.args.resourceType ?? this.record);
    }

    get showView() {
        if (this.args.showView === false) {
            return false;
        }

        return typeof this.args.onView === 'function' || this.canOpen;
    }

    get viewLabel() {
        return this.args.viewLabel ?? this.translate('common.view') ?? 'View';
    }

    @task *hydrate() {
        const record = unwrapRecord(this.args.resource);

        if (!record) {
            return;
        }

        try {
            let loaded = null;

            if (typeof this.descriptor?.hydrate === 'function') {
                loaded = yield this.descriptor.hydrate(record, this.owner);
            } else if (typeof record.loadResource === 'function') {
                loaded = yield record.loadResource();
            }

            if (loaded && typeof loaded === 'object') {
                this.hydrated = unwrapRecord(loaded);
            }
        } catch {
            this.hydrateFailed = true;
        }
    }

    @action view(event) {
        event?.preventDefault?.();
        event?.stopPropagation?.();

        if (typeof this.args.onClose === 'function') {
            this.args.onClose();
        }

        if (typeof this.args.onView === 'function') {
            return this.args.onView(this.record, event);
        }

        return openResource(this.owner, this.args.resource, { event, resourceType: this.args.resourceType });
    }
}
