# iOS Scene Life Cycle (Xcode 27)

Reference for `plugins/withIosSceneLifecycle.js`. Read this before touching the iOS
`AppDelegate`, deep linking, or the splash screen.

## The crash

Building with Xcode 27 (iOS 27 SDK) makes the app die on launch, before any JS runs:

```
[] failure in void _UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption(void)_block_invoke
(UIApplication_RuntimeIssues.m:106) : Application failed to launch:
UIScene life cycle is required for apps built with this SDK.
```

UIKit deprecated the old "app delegate owns a single `UIWindow`" model years ago. With the
iOS 27 SDK it is no longer just deprecated — an app that does not declare a
`UIApplicationSceneManifest` and vend a `UISceneDelegate` is refused at launch.

Expo SDK 54's prebuild template still emits the pre-scene pattern. `ExpoAppDelegate` is
declared as `UIResponder, ReactNativeFactoryProvider, UIApplicationDelegate` and literally
contains `// TODO: - Configuring and Discarding Scenes`. Upstream tracking issue:
[expo/expo#46664](https://github.com/expo/expo/issues/46664).

So we patch it ourselves in a config plugin. **When Expo ships its own migration, delete the
plugin** — the plugin throws a loud error if the template stops matching, which is the signal
to come back here.

## What the plugin does

### 1. Info.plist

Adds the manifest that tells UIKit which class is the scene delegate:

```
UIApplicationSceneManifest
  UIApplicationSupportsMultipleScenes = false
  UISceneConfigurations
    UIWindowSceneSessionRoleApplication
      UISceneConfigurationName    = "Default Configuration"
      UISceneDelegateClassName    = "$(PRODUCT_MODULE_NAME).SceneDelegate"
```

`$(PRODUCT_MODULE_NAME)` is expanded by Xcode when it processes Info.plist and resolves to
`ERAFit.SceneDelegate`. Swift class names in Info.plist must be module-qualified.

### 2. AppDelegate.swift

The window can no longer be created in `didFinishLaunchingWithOptions`, because UIKit only
hands the app a `UIWindowScene` to attach a window to *after* that method returns. So the
plugin removes these two lines:

```swift
window = UIWindow(frame: UIScreen.main.bounds)
factory.startReactNative(withModuleName: "main", in: window, launchOptions: launchOptions)
```

and stashes the launch options instead:

```swift
var launchOptions: [UIApplication.LaunchOptionsKey: Any]?   // new stored property
...
self.launchOptions = launchOptions
```

Then it appends a `SceneDelegate` that does the real startup on `scene(_:willConnectTo:)`:
create the window from the scene, point `appDelegate.window` at it, and call
`factory.startReactNative(...)` — which mounts the root view, shows the splash screen and calls
`makeKeyAndVisible()` internally (`RCTReactNativeFactory.mm`).

## Two things that are easy to break

### Deep links must be forwarded by hand

Once a scene delegate exists, UIKit stops calling the `UIApplicationDelegate` link hooks and
calls the scene equivalents instead. Nothing would reach `RCTLinkingManager` or the Expo app
delegate subscribers, so `SceneDelegate` forwards them manually:

| UIKit calls on the scene | Forwarded to `AppDelegate` |
|---|---|
| `scene(_:openURLContexts:)` | `application(_:open:options:)` |
| `scene(_:continue:)` | `application(_:continue:restorationHandler:)` |
| `connectionOptions.urlContexts` (cold start) | `application(_:open:options:)` |
| `connectionOptions.userActivities` (cold start) | `application(_:continue:restorationHandler:)` |

The cold-start rows matter: on a launch triggered by a link, the URL arrives in
`connectionOptions`, **not** in `launchOptions`. Miss that and deep links work only when the
app is already running. This covers the `erafit://` scheme, Apple Sign-In, and Google Sign-In.

Anything new that relies on an app-delegate URL/activity callback needs a matching forward
added here.

### Plugin ordering vs. `@react-native-firebase/app`

Firebase injects `FirebaseApp.configure()` into the *same* method, anchored on
`factory.startReactNative(` — the line this plugin deletes. If Firebase ran second, it would
find the only remaining `startReactNative(` call, the one inside `SceneDelegate`, and configure
Firebase on scene connection instead of at app launch (and re-run it on every scene
reconnect).

That cannot happen, because Firebase uses `withDangerousMod` while this plugin uses
`withAppDelegate`, and dangerous mods always run first (`dangerous: -2` in the mod compiler).
Its generated block is already in place when this plugin runs.

Belt and braces, the transform removes only the two specific lines it owns rather than
replacing the whole `#if os(iOS)` block, so anything injected between them survives in
`didFinishLaunchingWithOptions`. Verify after a prebuild that `FirebaseApp.configure()` is
still inside `didFinishLaunchingWithOptions`, not inside `SceneDelegate`.

Note that the ordering within `app.json`'s `plugins` array is the *reverse* of execution order
for `withAppDelegate` mods — the last plugin in the array runs its AppDelegate mod first.

## Verifying after a prebuild

```bash
npx expo prebuild -p ios --no-install     # --no-install: npm install wipes the Xcode 27 CLI patches
grep -n "SceneDelegate\|FirebaseApp.configure" ios/ERAFit/AppDelegate.swift
/usr/libexec/PlistBuddy -c "Print :UIApplicationSceneManifest" ios/ERAFit/Info.plist
```

Expect `FirebaseApp.configure()` above `#endif` in `didFinishLaunchingWithOptions`, and
`class SceneDelegate` at the end of the file.

Smoke test on device/simulator: cold launch (no crash, splash → app), background/foreground,
a cold-start deep link, and Apple/Google sign-in.
