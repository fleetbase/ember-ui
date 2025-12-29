import Component from '@glimmer/component';
import isImageFile from '../utils/is-image-file';

export default class FileComponent extends Component {
    get file() {
        return this.args.file;
    }

    get isImage() {
        return isImageFile(this.file);
    }

    get hasActions() {
        return typeof this.args.onDelete === 'function' || typeof this.args.onDownload === 'function' || typeof this.args.onPreview === 'function';
    }
}
