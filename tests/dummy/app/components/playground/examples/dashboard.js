import Component from '@glimmer/component';
import { DASHBOARD } from 'dummy/playground/fixtures';

/**
 * A local dashboard fixture with three safe widgets. The dashboard service is never asked to
 * persist anything.
 */
export default class PlaygroundExampleDashboardComponent extends Component {
    dashboard = DASHBOARD;
}
