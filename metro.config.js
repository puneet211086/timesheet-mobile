const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Allow Metro to bundle WebAssembly files used by expo-sqlite on web.
config.resolver.assetExts.push("wasm");

module.exports = config;
