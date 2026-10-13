/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // false = avoid double-effect in R3F dev mode
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei", "@react-spring/three"],

  webpack: (config, { isServer }) => {
    // WASM for Pyodide
    config.experiments = { ...config.experiments, asyncWebAssembly: true };

    // Fix for Three.js in webpack
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
      };
    }

    // Production obfuscation only
    if (!isServer && process.env.NODE_ENV === "production") {
      try {
        const WebpackObfuscator = require("webpack-obfuscator");
        config.plugins.push(
          new WebpackObfuscator(
            {
              compact: true,
              controlFlowFlattening: false,
              identifierNamesGenerator: "hexadecimal",
              renameGlobals: false,
              stringArray: true,
              stringArrayEncoding: ["base64"],
              stringArrayThreshold: 0.5,
            },
            ["node_modules/**", "pyodide/**", "monaco-editor/**", "three/**", "mermaid/**"]
          )
        );
      } catch {
        // webpack-obfuscator not installed — skip silently
      }
    }

    return config;
  },

  // COOP/COEP only in production (Pyodide SharedArrayBuffer)
  // In dev, these headers block HMR — so skip
  async headers() {
    if (process.env.NODE_ENV !== "production") return [];
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
