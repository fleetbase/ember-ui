import { htmlSafe } from '@ember/template';
import { isBlank } from '@ember/utils';

function escapeHtml(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function line(content, className = '') {
    const classAttribute = className ? ` class="${className}"` : '';

    return `<div${classAttribute}>${escapeHtml(content)}</div>`;
}

export default function placeAddress(place, options = {}) {
    const address = place?.place ?? place;

    if (!address) {
        return htmlSafe('');
    }

    const { showTitle = true } = options;
    const name = address.name === address.street1 ? null : address.name;
    const cityStatePostalCode = [address.city, address.province, address.postal_code].filter((value) => !isBlank(value)).join(', ');
    const lines = [];

    if (name) {
        if (showTitle) {
            lines.push(line(name, 'font-semibold'));
        }
        lines.push(line(address.street1));
    } else if (address.street1) {
        lines.push(line(address.street1, 'font-semibold'));
    }

    if (address.street2) {
        lines.push(line(address.street2));
    }

    if (cityStatePostalCode) {
        lines.push(line(cityStatePostalCode));
    }

    if (address.country_name || address.country) {
        lines.push(line(address.country_name ?? address.country));
    }

    return htmlSafe(`<address class="uppercase truncate w-full">${lines.join('')}</address>`);
}
