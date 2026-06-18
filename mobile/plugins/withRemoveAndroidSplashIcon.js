const { withAndroidStyles } = require("@expo/config-plugins");

// Workaround for @expo/prebuild-config writing
// `windowSplashScreenAnimatedIcon -> @drawable/splashscreen_logo`
// into Theme.App.SplashScreen even when no splash `image` is configured.
// The drawable is never generated, so processDebugResources fails.
// Must be listed BEFORE `expo-splash-screen` in app.json's plugins array so
// that this mod runs AFTER the splash plugin (config-plugins onion ordering).
const withRemoveAndroidSplashIcon = (config) => {
  return withAndroidStyles(config, (cfg) => {
    const styles = cfg.modResults?.resources?.style;
    if (Array.isArray(styles)) {
      for (const style of styles) {
        if (style?.$?.name !== "Theme.App.SplashScreen") continue;
        if (!Array.isArray(style.item)) continue;
        style.item = style.item.filter(
          (it) => it?.$?.name !== "windowSplashScreenAnimatedIcon",
        );
      }
    }
    return cfg;
  });
};

module.exports = withRemoveAndroidSplashIcon;
