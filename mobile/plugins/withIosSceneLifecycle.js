/**
 * Adopts the UIKit scene-based life cycle on iOS.
 *
 * Apps linked against the iOS 27 SDK (Xcode 27) trap at launch inside
 * `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption` unless they declare a
 * `UIApplicationSceneManifest` and vend a `UISceneDelegate`:
 *
 *   Application failed to launch: UIScene life cycle is required for apps built with this SDK.
 *
 * The Expo SDK 54 prebuild template still uses the pre-scene `UIApplicationDelegate` + `window`
 * pattern — `ExpoAppDelegate` is `UIResponder, UIApplicationDelegate` with a literal
 * "TODO: - Configuring and Discarding Scenes" — so patch it here until upstream ships its own
 * migration (expo/expo#46664).
 *
 * Two changes:
 *   1. Info.plist gains a `UIApplicationSceneManifest` pointing at `SceneDelegate`.
 *   2. `AppDelegate.swift` stops creating the window in `didFinishLaunchingWithOptions` (it
 *      stashes `launchOptions` instead) and gains a `SceneDelegate` that creates the window
 *      once UIKit hands it a `UIWindowScene`.
 *
 * On co-existing with other AppDelegate patches: `@react-native-firebase/app` injects
 * `FirebaseApp.configure()` into the same method, but it does so from a *dangerous* mod, and
 * dangerous mods always run before `appDelegate` mods (`dangerous: -2` in the mod compiler).
 * Its generated block is therefore already in place when this plugin runs. The transform below
 * only removes the two specific lines it owns and leaves everything else in the method alone,
 * so that block keeps running at app launch rather than being dragged into scene connection.
 *
 * Docs: mobile/doc/IOS_SCENE_LIFECYCLE.md
 */

const { withAppDelegate, withInfoPlist } = require("@expo/config-plugins");

// The two statements the prebuild template puts in `didFinishLaunchingWithOptions`. They are
// matched separately, not as one block, because plugins running earlier (Firebase) inject
// generated code between them.
const WINDOW_LINE = /^[ \t]*window = UIWindow\(frame: UIScreen\.main\.bounds\)[ \t]*\n/m;
const START_REACT_NATIVE_CALL = /^[ \t]*factory\.startReactNative\([\s\S]*?\)[ \t]*\n/m;

const FACTORY_PROPERTY = /^([ \t]*var reactNativeFactory: RCTReactNativeFactory\?[ \t]*\n)/m;

const MODULE_NAME = /withModuleName:\s*"([^"]+)"/;

const DEFERRED_WINDOW_SETUP = `    // The window is created in \`SceneDelegate\` instead: UIKit only hands us a
    // \`UIWindowScene\` to attach it to after this method has returned.
    self.launchOptions = launchOptions
`;

const LAUNCH_OPTIONS_PROPERTY = `  var launchOptions: [UIApplication.LaunchOptionsKey: Any]?
`;

const sceneDelegate = (moduleName) => `
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else {
      return
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    // Keep \`UIApplication.shared.delegate.window\` pointing at the live window.
    appDelegate.window = window

    // Mounts the root view, shows the splash screen and calls \`makeKeyAndVisible()\`.
    factory.startReactNative(
      withModuleName: "${moduleName}",
      in: window,
      launchOptions: appDelegate.launchOptions)

    // Cold-start deep links arrive here rather than through \`launchOptions\`.
    connectionOptions.urlContexts.forEach { handleOpenURLContext($0) }
    connectionOptions.userActivities.forEach { handleUserActivity($0) }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    URLContexts.forEach { handleOpenURLContext($0) }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    handleUserActivity(userActivity)
  }

  // Once a scene delegate exists UIKit stops calling the \`UIApplicationDelegate\` link hooks,
  // so forward to them by hand. That keeps RCTLinkingManager and the Expo app delegate
  // subscribers behind expo-linking and expo-apple-authentication receiving URLs.
  private func handleOpenURLContext(_ context: UIOpenURLContext) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
      return
    }
    var options: [UIApplication.OpenURLOptionsKey: Any] = [.openInPlace: context.options.openInPlace]
    if let sourceApplication = context.options.sourceApplication {
      options[.sourceApplication] = sourceApplication
    }
    _ = appDelegate.application(UIApplication.shared, open: context.url, options: options)
  }

  private func handleUserActivity(_ userActivity: NSUserActivity) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
      return
    }
    _ = appDelegate.application(UIApplication.shared, continue: userActivity) { _ in }
  }
}
`;

const withSceneManifest = (config) =>
  withInfoPlist(config, (modConfig) => {
    modConfig.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            // Expanded by Xcode when it processes Info.plist — resolves to `ERAFit.SceneDelegate`.
            UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
          },
        ],
      },
    };
    return modConfig;
  });

const withSceneDelegate = (config) =>
  withAppDelegate(config, (modConfig) => {
    const { language } = modConfig.modResults;
    if (language !== "swift") {
      throw new Error(
        `[withIosSceneLifecycle] expects a Swift AppDelegate, found "${language}".`,
      );
    }

    let contents = modConfig.modResults.contents;
    // Idempotent: prebuild without --clean can run the mods over an already-patched file.
    if (contents.includes("class SceneDelegate")) return modConfig;

    const startCall = contents.match(START_REACT_NATIVE_CALL);

    // Fail loudly rather than silently shipping an app that launches to a black screen.
    if (!startCall || !WINDOW_LINE.test(contents) || !FACTORY_PROPERTY.test(contents)) {
      throw new Error(
        "[withIosSceneLifecycle] could not find the expected window setup in AppDelegate.swift. " +
          "The prebuild template has changed — check whether Expo now adopts the scene life cycle " +
          "itself (expo/expo#46664) and remove this plugin if so.",
      );
    }

    const moduleName = startCall[0].match(MODULE_NAME)?.[1] ?? "main";

    contents = contents.replace(WINDOW_LINE, DEFERRED_WINDOW_SETUP);
    contents = contents.replace(START_REACT_NATIVE_CALL, "");
    contents = contents.replace(FACTORY_PROPERTY, `$1${LAUNCH_OPTIONS_PROPERTY}`);

    modConfig.modResults.contents = `${contents}${sceneDelegate(moduleName)}`;
    return modConfig;
  });

const withIosSceneLifecycle = (config) => withSceneDelegate(withSceneManifest(config));

module.exports = withIosSceneLifecycle;
