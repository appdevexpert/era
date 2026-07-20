/**
 * Patches the generated iOS Podfile to fix two Xcode-16 + useFrameworks:static
 * issues that break `pod install` / build otherwise:
 *
 *   1. Some transitive Swift pods (SDWebImage family, Clarity) don't ship
 *      module maps, so they can't be built as static frameworks without
 *      `:modular_headers => true`.
 *   2. Many resource-bundle pod targets (Firebase, Google, Sentry, SDWebImage)
 *      ship with IPHONEOS_DEPLOYMENT_TARGET set to 9.0-13.4, which Xcode 16
 *      rejects as below the supported floor of 15.0.
 *
 * Both patches are re-applied every `expo prebuild --clean` so the fixes
 * survive Podfile regeneration.
 *
 * Docs: mobile/doc/ANALYTICS.md
 */

const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MODULAR_HEADER_PODS = [
  "SDWebImage",
  "SDWebImageSVGCoder",
  "SDWebImageAVIFCoder",
  "SDWebImageWebPCoder",
  "Clarity",
  "FirebaseCore",
  "FirebaseCoreInternal",
  "FirebaseAnalytics",
  "GoogleAppMeasurement",
  "GoogleUtilities",
  "FirebaseInstallations",
  "nanopb",
];

const DEPLOYMENT_TARGET = "15.1";

const MODULAR_HEADER_BLOCK = `
  # === withPodfileFixes: modular_headers ===
  # Forced by plugins/withPodfileFixes.js — do not edit; regenerated on prebuild.
${MODULAR_HEADER_PODS.map((name) => `  pod '${name}', :modular_headers => true`).join("\n")}
  # === /withPodfileFixes: modular_headers ===
`;

const POST_INSTALL_BLOCK = `
    # === withPodfileFixes: deployment_target ===
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${DEPLOYMENT_TARGET}'
      end
    end
    # === /withPodfileFixes: deployment_target ===
`;

function patchPodfile(contents) {
  // Skip if already patched (idempotent).
  if (contents.includes("withPodfileFixes: modular_headers")) return contents;

  // Insert modular_headers pods right after the use_frameworks! lines.
  const useFrameworksMarker = /use_frameworks! :linkage => ENV\['USE_FRAMEWORKS'\]\.to_sym if ENV\['USE_FRAMEWORKS'\]/;
  if (!useFrameworksMarker.test(contents)) {
    throw new Error(
      "[withPodfileFixes] use_frameworks! marker not found in Podfile — Expo may have changed the template. Update the plugin.",
    );
  }
  contents = contents.replace(
    useFrameworksMarker,
    (match) => `${match}\n${MODULAR_HEADER_BLOCK}`,
  );

  // Insert deployment target bump inside the post_install block, right after
  // react_native_post_install(...).
  const rnPostInstallMarker = /react_native_post_install\([\s\S]*?\)\n/;
  if (!rnPostInstallMarker.test(contents)) {
    throw new Error(
      "[withPodfileFixes] react_native_post_install marker not found in Podfile — Expo may have changed the template. Update the plugin.",
    );
  }
  contents = contents.replace(
    rnPostInstallMarker,
    (match) => `${match}${POST_INSTALL_BLOCK}`,
  );

  return contents;
}

const withPodfileFixes = (config) => {
  return withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      const podfilePath = path.join(
        modConfig.modRequest.platformProjectRoot,
        "Podfile",
      );
      const original = fs.readFileSync(podfilePath, "utf8");
      const patched = patchPodfile(original);
      if (patched !== original) {
        fs.writeFileSync(podfilePath, patched, "utf8");
      }
      return modConfig;
    },
  ]);
};

module.exports = withPodfileFixes;
