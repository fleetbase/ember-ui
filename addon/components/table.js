import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, set } from '@ember/object';
import { filter } from '@ember/object/computed';

export default class TableComponent extends Component {
  @tracked allRowsSelected = false;
  @filter('args.columns', (column) => !column.hidden) visibleColumns;

  @action selectAllRows() {
    const { rows } = this.args;

    this.allRowsSelected = !this.allRowsSelected;

    for (let i = 0; i < rows.length; i++) {
      const row = rows.objectAt(i);
      set(row, 'checked', this.allRowsSelected);
    }
  }
}
