import Component from '@glimmer/component';
import { TEMPLATE, TEMPLATE_ELEMENTS } from 'dummy/playground/fixtures';

/**
 * A small local template fixture. Saving reports to the event log only; there is no API access.
 */
export default class PlaygroundExampleTemplateBuilderComponent extends Component {
    template = TEMPLATE;

    elements = TEMPLATE_ELEMENTS;
}
