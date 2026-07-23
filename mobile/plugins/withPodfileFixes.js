/**
 * Patches the generated iOS Podfile to fix Xcode + useFrameworks:static
 * issues that break `pod install` / build otherwise:
 *
 *   1. Some transitive Swift pods (SDWebImage family, Clarity) don't ship
 *      module maps, so they can't be built as static frameworks without
 *      `:modular_headers => true`. React-Core + friends are added for
 *      the RN Firebase static-framework build.
 *   2. Many resource-bundle pod targets (Firebase, Google, Sentry, SDWebImage)
 *      ship with IPHONEOS_DEPLOYMENT_TARGET below the supported floor of 15.1
 *      which recent Xcode releases reject.
 *   3. RN Firebase requires `$RNFirebaseAsStaticFramework = true` at the top
 *      of the Podfile when the host app uses static frameworks. Documented
 *      in https://rnfirebase.io/#altering-cocoapods-to-use-frameworks.
 *
 * All patches are re-applied every `expo prebuild --clean` so the fixes
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
];

const DEPLOYMENT_TARGET = "15.1";

const RNFB_STATIC_FLAG_BLOCK = `
# === withPodfileFixes: rnfirebase_static ===
# Required by RN Firebase (@react-native-firebase/*) when the host uses
# useFrameworks:static — makes RNFB pods themselves build as static frameworks.
# See: https://rnfirebase.io/#altering-cocoapods-to-use-frameworks
$RNFirebaseAsStaticFramework = true
# === /withPodfileFixes: rnfirebase_static ===
`;

const MODULAR_HEADER_BLOCK = `
  # === withPodfileFixes: modular_headers ===
  # Forced by plugins/withPodfileFixes.js — do not edit; regenerated on prebuild.
${MODULAR_HEADER_PODS.map((name) => `  pod '${name}', :modular_headers => true`).join("\n")}
  # === /withPodfileFixes: modular_headers ===
`;

const POST_INSTALL_BLOCK = `
    # === withPodfileFixes: deployment_target + rnfb non-modular headers ===
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${DEPLOYMENT_TARGET}'
        # RN Firebase pods (RNFBApp, RNFBAnalytics, ...) have headers that do
        # \`#import <React/RCTConvert.h>\` non-modularly. Under use_frameworks!
        # static, Clang rejects that inside a framework module. Allow it only
        # for these pods so React-Core's own module boundary stays intact.
        if target.name.start_with?('RNFB')
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
          config.build_settings['DEFINES_MODULE'] = 'NO'
        end
      end
    end
    # === /withPodfileFixes: deployment_target + rnfb non-modular headers ===
`;

function patchPodfile(contents) {
  // Skip if already patched (idempotent).
  if (contents.includes("withPodfileFixes: modular_headers")) return contents;

  // 1. Prepend $RNFirebaseAsStaticFramework flag at the very top of the Podfile,
  //    before any target definitions. Placed right after the require lines.
  const requireLineMarker = /require File\.join\([\s\S]*?\)\n/;
  if (requireLineMarker.test(contents)) {
    contents = contents.replace(
      requireLineMarker,
      (match) => `${match}${RNFB_STATIC_FLAG_BLOCK}`,
    );
  } else {
    // Fallback: prepend to the file.
    contents = `${RNFB_STATIC_FLAG_BLOCK}\n${contents}`;
  }

  // 2. Insert modular_headers pods right after the use_frameworks! line.
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

  // 3. Insert deployment target + non-modular header settings inside the
  //    post_install block, right after react_native_post_install(...).
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
