'use strict';
const CssImport = require('postcss-import');
const PresetEnv = require('postcss-preset-env');

module.exports = {
  name: require('./package').name,
  included: function (app) {
    this._super.included.apply(this, arguments);
    app.options = app.options || {};

    if (Array.isArray(app.options.postcssOptions?.compile?.plugins)) {
      app.options.postcssOptions.compile.plugins.push(
        { module: CssImport },
        {
          module: PresetEnv,
          options: { stage: 1 },
        }
      );
    } else {
      app.options.postcssOptions = {
        compile: {
          enabled: true,
          plugins: [
            { module: CssImport },
            {
              module: PresetEnv,
              options: { stage: 1 },
            },
          ],
        },
      };
    }
  },
};
