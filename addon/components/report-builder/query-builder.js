import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { emptyJoin, emptyWhere, emptyOrder, JOIN_TYPES, OPERATORS, AGGREGATE_FUNCTIONS } from '../../utils/report-builder';

export default class ReportBuilderQueryBuilderComponent extends Component {
    @tracked primaryTable;
}
