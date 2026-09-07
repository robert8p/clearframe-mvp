const { withMainApplication } = require("expo/config-plugins");

const START = "// @generated begin cogni-android-font-scale-layout";
const END = "// @generated end cogni-android-font-scale-layout";
const BLOCK = `    ${START}
    // RN 0.81.5 otherwise leaves fontScale out of Android's text-cache identity.
    // Run after RN's stable defaults are installed, before any React surface exists.
    check(BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      "Cogni font-scale configuration requires the New Architecture."
    }
    check(com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.releaseLevel == com.facebook.react.common.ReleaseLevel.STABLE) {
      "Cogni font-scale configuration requires React Native's stable release level."
    }
    val cogniPreviouslyAccessedFlags =
      com.facebook.react.internal.featureflags.ReactNativeFeatureFlags.dangerouslyForceOverride(
        object : com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsProvider by
          com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsOverrides_RNOSS_Stable_Android(
            fabricEnabled = true,
            bridgelessEnabled = true,
            turboModulesEnabled = true
          ) {
          override fun enableFontScaleChangesUpdatingLayout(): Boolean = true
        }
      )
    check(cogniPreviouslyAccessedFlags?.contains("enableFontScaleChangesUpdatingLayout") != true) {
      "Cogni font-scale configuration ran after the font-scale flag was already accessed."
    }
    ${END}`;

/**
 * Version-pinned workaround for Android Fabric's stale layout after a live text
 * size change. Keep Screen's fontScale remount as well: RN's cloned root can
 * remain layout-clean even with this feature flag enabled (upstream #57124).
 *
 * Normal override() cannot be used here: loadReactNative() already installs the
 * stable provider. The startup-only force override delegates every other flag
 * to that exact provider and rejects a late read of the only flag being changed.
 * Never move this into an Activity, JS bridge call, or a running React surface.
 */
module.exports = function withAndroidFontScaleLayout(config) {
  const rnVersion = require("react-native/package.json").version;
  const expoVersion = require("expo/package.json").version;
  if (rnVersion !== "0.81.5" || !expoVersion.startsWith("54.")) {
    throw new Error(`Cogni font-scale workaround must be re-reviewed for Expo ${expoVersion} / React Native ${rnVersion}.`);
  }
  if (config.newArchEnabled === false) {
    throw new Error("Cogni font-scale workaround requires the New Architecture.");
  }

  return withMainApplication(config, (androidConfig) => {
    if (androidConfig.modResults.language !== "kt") {
      throw new Error("Cogni font-scale workaround requires the verified Kotlin MainApplication template.");
    }
    let source = androidConfig.modResults.contents;
    if (source.includes(START) || source.includes(END)) {
      if (source.split(START).length !== 2 || source.split(END).length !== 2 || !source.includes(BLOCK)) {
        throw new Error("Cogni font-scale startup block was changed; refusing to insert a second override.");
      }
      source = source.replace(`${BLOCK}\n`, "");
    }
    const anchor = /^([ \t]*)loadReactNative\(this\)[ \t]*\r?$/gm;
    const anchors = [...source.matchAll(anchor)];
    const lifecycle = /^([ \t]*)ApplicationLifecycleDispatcher\.onApplicationCreate\(this\)[ \t]*\r?$/gm;
    const dispatches = [...source.matchAll(lifecycle)];
    if (anchors.length !== 1 || dispatches.length !== 1 || !/override fun onCreate\(\)/.test(source)) {
      throw new Error("Cogni font-scale workaround could not verify the Expo 54 startup anchors.");
    }
    const afterLoad = anchors[0].index + anchors[0][0].length;
    if (dispatches[0].index <= afterLoad || source.slice(afterLoad, dispatches[0].index).trim()) {
      throw new Error("Cogni font-scale workaround must run immediately after loadReactNative and before lifecycle dispatch.");
    }
    if (/ReactNativeFeatureFlags\.(?:override|dangerouslyReset|dangerouslyForceOverride)\s*\(/.test(source)) {
      throw new Error("Another React Native flag override needs review before enabling Cogni's font-scale workaround.");
    }
    androidConfig.modResults.contents = source.slice(0, afterLoad) + "\n" + BLOCK + source.slice(afterLoad);
    return androidConfig;
  });
};
