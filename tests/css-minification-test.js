const { test } = QUnit;
const CleanCSS = require('clean-css');
const fs = require('fs');
const path = require('path');
const cssDirectory = '../app/styles';

test('CSS minification for all files in a directory', async (assert) => {
    const files = fs.readdirSync(cssDirectory);

    files.forEach((file) => {
        if (path.extname(file) === '.css') {
            const filePath = path.join(cssDirectory, file);
            let errorOccurred = false;
            let errorMessage = '';

            try {
                const cssContent = fs.readFileSync(filePath, 'utf8');
                const output = new CleanCSS().minify(cssContent);

                if (output.errors && output.errors.length > 0) {
                    errorOccurred = true;
                    errorMessage = output.errors.join(', ');
                }
            } catch (error) {
                errorOccurred = true;
                errorMessage = error.message;
            }

            assert.equal(errorOccurred, false, `CSS minification should not produce any errors for file '${filePath}'. Error message: ${errorMessage}`);
        }
    });
});
