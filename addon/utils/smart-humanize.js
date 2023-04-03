import { capitalize, decamelize } from '@ember/string';
import { humanize } from 'ember-cli-string-helpers/helpers/humanize';

export default function smartHumanize(string) {
    const uppercase = ['api', 'vat', 'id', 'sku'];

    return humanize([decamelize(string)])
        .toLowerCase()
        .split(' ')
        .map((word) => {
            if (uppercase.includes(word)) {
                return word.toUpperCase();
            }

            return capitalize(word);
        })
        .join(' ');
}
