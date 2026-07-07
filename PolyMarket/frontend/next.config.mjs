/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  webpack: (config) => {
    // @metamask/sdk (pulled in by RainbowKit) optionally imports a React-Native
    // storage module that doesn't exist in web builds — stub it to silence the warning.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
    };
    return config;
  },
};

export default nextConfig;
