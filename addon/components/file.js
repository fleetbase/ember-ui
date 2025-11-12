import Component from '@glimmer/component';
import isImageFile from '../utils/is-image-file';

export default class FileComponent extends Component {
    get file() {
        return this.args.file;
    }

    get isImage() {
        return isImageFile(this.file);
    }
}
