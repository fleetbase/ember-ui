import Component from '@glimmer/component';
import { action } from '@ember/object';

/**
 * ScheduleItemCard Component
 *
 * Displays a schedule item in a card format with customizable content via named blocks.
 *
 * @example
 * <ScheduleItemCard @item={{this.scheduleItem}} @onClick={{this.handleClick}}>
 *   <:content>
 *     <div class="custom-content">
 *       {{@item.title}}
 *     </div>
 *   </:content>
 *   <:actions>
 *     <button {{on "click" this.edit}}>Edit</button>
 *     <button {{on "click" this.delete}}>Delete</button>
 *   </:actions>
 * </ScheduleItemCard>
 */
export default class ScheduleItemCardComponent extends Component {
    /**
     * Get status badge color
     */
    get statusBadgeColor() {
        const colors = {
            pending: 'yellow',
            confirmed: 'green',
            in_progress: 'blue',
            completed: 'gray',
            cancelled: 'red',
            no_show: 'orange',
        };

        return colors[this.args.item?.status] || 'gray';
    }

    /**
     * Get formatted time range
     */
    get timeRange() {
        const item = this.args.item;
        if (!item?.start_at || !item?.end_at) {
            return '';
        }

        const start = new Date(item.start_at);
        const end = new Date(item.end_at);

        return `${this.formatTime(start)} - ${this.formatTime(end)}`;
    }

    /**
     * Format time
     */
    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    }

    /**
     * Handle card click
     */
    @action
    handleClick(event) {
        if (this.args.onClick) {
            this.args.onClick(this.args.item, event);
        }
    }
}
