export default {
  expo: {
    name: "Aureum",
    slug: "aureum-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#F59E0B"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.anthony.mobile"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#F59E0B"
      },
      package: "com.anthony.mobile"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      // Priorizar API_URL del .env, con fallback a la IP hardcodeada (SIN /api)
      apiUrl: process.env.API_URL || "http://192.168.0.4:5000",// IP de fallback SIN /api
      eas: {
        projectId: "01265406-9867-495b-b2d5-faec767b37d8"
      }
    },
    plugins: [
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#F59E0B"
        }
      ],
      "expo-secure-store"
    ],
    scheme: "com.anthony.mobile",
    experiments: {
      tsconfigPaths: true,
    }
  }
};