import { capitalize, decamelize } from '@ember/string';
import { humanize } from 'ember-cli-string-helpers/helpers/humanize';

export default function smartHumanize(string) {
    if (!typeof string === 'string') {
        return string;
    }

    const uppercase = ['api', 'vat', 'id', 'uuid', 'sku', 'ean', 'upc', 'erp', 'tms', 'wms', 'ltl', 'ftl', 'lcl', 'fcl', 'rfid', 'jot', 'roi', 'eta', 'pod', 'asn', 'oem', 'ddp', 'fob'];

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
