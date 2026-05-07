const { getSentryExpoConfig } = require("@sentry/react-native/metro");

// Using getSentryExpoConfig instead of getDefaultConfig adds the Sentry
// serializer which generates source maps for readable stack traces.
const config = getSentryExpoConfig(__dirname);

config.transformer.babelTransformerPath = require.resolve("react-native-svg-transformer/expo");
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== "svg");
if (!config.resolver.sourceExts.includes("svg")) {
  config.resolver.sourceExts.push("svg");
}

module.exports = config;
