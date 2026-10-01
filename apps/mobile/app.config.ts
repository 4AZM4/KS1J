import type { ConfigContext, ExpoConfig } from 'expo/config';

// EXPO_BASE_URL (e.g. "/KS1J/app") builds the web version as a single-page app under that path,
// for the GitHub Pages preview. Phone builds are unaffected.
export default ({ config }: ConfigContext): ExpoConfig => {
  const baseUrl = process.env.EXPO_BASE_URL;
  if (!baseUrl) return config as ExpoConfig;
  return {
    ...(config as ExpoConfig),
    web: { ...config.web, output: 'single' },
    experiments: { ...config.experiments, baseUrl },
  };
};
