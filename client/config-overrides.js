const path = require('path');

module.exports = function override(config, env) {
  // Exclude chess.js from source-map-loader to avoid build errors
  const sourceMapLoaderRule = {
    test: /\.js$/,
    enforce: 'pre',
    use: ['source-map-loader'],
    exclude: [
      /node_modules\/chess\.js/,
      path.resolve(__dirname, 'node_modules/chess.js')
    ]
  };

  // Find existing source-map-loader rules and modify them
  config.module.rules.forEach(rule => {
    if (rule.oneOf) {
      rule.oneOf.forEach(oneOfRule => {
        if (oneOfRule.enforce === 'pre' && Array.isArray(oneOfRule.use)) {
          oneOfRule.use.forEach((loader, index) => {
            if (loader.loader && loader.loader.includes('source-map-loader')) {
              if (!oneOfRule.exclude) {
                oneOfRule.exclude = [];
              }
              if (Array.isArray(oneOfRule.exclude)) {
                oneOfRule.exclude.push(/node_modules\/chess\.js/);
              } else {
          oneOfRule.exclude = [
                  oneOfRule.exclude,
                  /node_modules\/chess\.js/
          ];
        }
            }
          });
        }
      });
    }
  });

  // Ignore warnings about source maps
  config.ignoreWarnings = [
    /Failed to parse source map/,
        /node_modules\/chess\.js/,
    /ENOENT.*chess\.js/
      ];

  return config;
};
