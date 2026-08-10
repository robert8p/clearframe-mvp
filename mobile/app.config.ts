import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const projectId = process.env.EXPO_PROJECT_ID;
  const owner = process.env.EXPO_OWNER;
  return {
    ...config,
    name: "Cogni",
    slug: "cogni",
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "dark",
    scheme: "cogni",
    owner: owner || undefined,
    ios: {
      supportsTablet: false,
      bundleIdentifier: "app.gocogni.cogni",
    },
    android: {
      package: "app.gocogni.cogni",
      adaptiveIcon: { backgroundColor: "#070d1b" },
      edgeToEdgeEnabled: true,
    },
    plugins: ["expo-router"],
    experiments: { typedRoutes: true },
    extra: {
      ...(config.extra ?? {}),
      ...(projectId ? { eas: { projectId } } : {}),
    },
  };
};
