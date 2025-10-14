import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

export default class SpinnerComponent extends Component {
    @tracked height = 16;
    @tracked width = 16;

    get sizeMap() {
        return {
            xs: { width: 12, height: 12 },
            sm: { width: 14, height: 14 },
            md: { width: 16, height: 16 },
            lg: { width: 18, height: 18 },
            xl: { width: 20, height: 20 },
            '2xl': { width: 22, height: 22 },
            '3xl': { width: 24, height: 24 },
        };
    }

    constructor(owner, { height = 16, width = 16, size }) {
        super(...arguments);
        if (size) {
            this.#resolveSize(size);
        } else {
            this.height = height;
            this.width = width;
        }
    }

    #resolveSize(size) {
        if (typeof size === 'number') {
            this.height = size;
            this.width = size;
        } else {
            const { height, width } = this.sizeMap[size] ?? this.sizeMap.md;
            this.height = height;
            this.width = width;
        }
    }
}
