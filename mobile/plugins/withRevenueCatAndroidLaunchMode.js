const { withAndroidManifest } = require("expo/config-plugins");

/**
 * RevenueCat requires the Activity that launches Google Play Billing to use
 * `standard` or `singleTop`. Expo's generated MainActivity defaults to
 * `singleTask`, which can cancel a purchase when the customer temporarily
 * leaves Cogni to confirm payment in a banking app.
 *
 * Keep this as a managed-workflow config plugin so every EAS/prebuild artifact
 * receives the setting without committing generated native projects.
 */
module.exports = function withRevenueCatAndroidLaunchMode(config) {
  return withAndroidManifest(config, (androidConfig) => {
    const application = androidConfig.modResults.manifest.application?.[0];
    const activities = application?.activity ?? [];
    const mainActivity = activities.find((activity) => {
      const name = activity.$?.["android:name"];
      return name === ".MainActivity" || name?.endsWith(".MainActivity");
    });

    if (!mainActivity?.$) {
      throw new Error(
        "Cogni RevenueCat setup could not find Android MainActivity; refusing to build an unverified billing manifest.",
      );
    }

    mainActivity.$["android:launchMode"] = "singleTop";
    return androidConfig;
  });
};
