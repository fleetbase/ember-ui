import Component from '@glimmer/component';
import { REPORT_TABLES, REPORT_QUERY } from 'dummy/playground/fixtures';

/**
 * A starter scenario only. No query is executed and no write is performed — the builder is shown
 * with a static table list and an initial query it can render against.
 */
export default class PlaygroundExampleReportBuilderComponent extends Component {
    tables = REPORT_TABLES;

    initialQuery = REPORT_QUERY;
}
