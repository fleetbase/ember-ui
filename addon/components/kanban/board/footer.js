import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

export default class KanbanBoardFooterComponent extends Component {
    @service intl;

    /**
     * Get board statistics
     */
    get boardStats() {
        const columns = this.args.columns || [];
        const totalCards = this.args.totalCards || 0;
        const selectedCount = this.args.selectedCards?.size || 0;

        // Calculate priority distribution
        const priorityStats = { high: 0, medium: 0, low: 0, none: 0 };
        const assigneeStats = new Map();
        const tagStats = new Map();
        let overdueCount = 0;
        let dueSoonCount = 0;

        columns.forEach((column) => {
            (column.cards || []).forEach((card) => {
                // Priority stats
                if (card.priority) {
                    priorityStats[card.priority]++;
                } else {
                    priorityStats.none++;
                }

                // Assignee stats
                if (card.assignee) {
                    const count = assigneeStats.get(card.assignee.id) || 0;
                    assigneeStats.set(card.assignee.id, count + 1);
                }

                // Tag stats
                if (card.tags) {
                    card.tags.forEach((tag) => {
                        const count = tagStats.get(tag.id) || 0;
                        tagStats.set(tag.id, count + 1);
                    });
                }

                // Due date stats
                if (card.dueDate) {
                    const dueDate = new Date(card.dueDate);
                    const now = new Date();

                    if (dueDate < now) {
                        overdueCount++;
                    } else {
                        const timeDiff = dueDate.getTime() - now.getTime();
                        const hoursDiff = timeDiff / (1000 * 3600);
                        if (hoursDiff <= 24) {
                            dueSoonCount++;
                        }
                    }
                }
            });
        });

        return {
            totalCards,
            selectedCount,
            columnCount: columns.length,
            priorityStats,
            assigneeStats,
            tagStats,
            overdueCount,
            dueSoonCount,
            averageCardsPerColumn: columns.length > 0 ? Math.round(totalCards / columns.length) : 0,
        };
    }

    /**
     * Get WIP limit statistics
     */
    get wipLimitStats() {
        const columns = this.args.columns || [];
        let columnsWithLimits = 0;
        let columnsOverLimit = 0;
        let columnsAtLimit = 0;

        columns.forEach((column) => {
            if (column.wipLimit) {
                columnsWithLimits++;
                const cardCount = column.cards?.length || 0;

                if (cardCount > column.wipLimit) {
                    columnsOverLimit++;
                } else if (cardCount === column.wipLimit) {
                    columnsAtLimit++;
                }
            }
        });

        return {
            columnsWithLimits,
            columnsOverLimit,
            columnsAtLimit,
            hasWipIssues: columnsOverLimit > 0,
        };
    }

    /**
     * Get performance metrics
     */
    get performanceMetrics() {
        const columns = this.args.columns || [];
        const totalCards = this.args.totalCards || 0;

        // Calculate throughput (cards completed in last period)
        // This would typically come from historical data
        const throughput = 0; // Placeholder

        // Calculate cycle time (average time cards spend in progress)
        // This would typically come from card history
        const averageCycleTime = 0; // Placeholder

        // Calculate lead time (total time from creation to completion)
        // This would typically come from card history
        const averageLeadTime = 0; // Placeholder

        return {
            throughput,
            averageCycleTime,
            averageLeadTime,
            totalCards,
        };
    }

    /**
     * Format duration for display
     */
    formatDuration(hours) {
        if (hours < 24) {
            return `${Math.round(hours)}h`;
        } else if (hours < 24 * 7) {
            return `${Math.round(hours / 24)}d`;
        } else {
            return `${Math.round(hours / (24 * 7))}w`;
        }
    }

    /**
     * Handle export action
     */
    @action
    onExport(format) {
        if (this.args.onExport) {
            this.args.onExport(format);
        }
    }

    /**
     * Handle print action
     */
    @action
    onPrint() {
        if (this.args.onPrint) {
            this.args.onPrint();
        } else {
            window.print();
        }
    }

    /**
     * Handle refresh action
     */
    @action
    onRefresh() {
        if (this.args.onRefresh) {
            this.args.onRefresh();
        }
    }

    /**
     * Handle settings action
     */
    @action
    onSettings() {
        if (this.args.onSettings) {
            this.args.onSettings();
        }
    }
}
