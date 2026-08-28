import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { KANBAN_BOARD } from 'dummy/playground/fixtures';

/**
 * The board is held locally so drags mutate the preview and nothing else.
 */
export default class PlaygroundExampleKanbanComponent extends Component {
    @tracked columns = KANBAN_BOARD.map((column) => ({ ...column, cards: [...column.cards] }));
}
