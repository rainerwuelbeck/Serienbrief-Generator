import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Diese Pakete enthalten native Binaries / Worker-Dateien (Puppeteer/Chromium,
  // Canvas-Rendering, PDF.js) und dürfen nicht ins Webpack-Bundle gezogen werden,
  // sondern müssen zur Laufzeit ganz normal aus node_modules geladen werden.
  serverExternalPackages: [
    "puppeteer-core",
    "puppeteer",
    "@sparticuz/chromium",
    "@napi-rs/canvas",
    "pdfjs-dist",
  ],
};

export default nextConfig;
