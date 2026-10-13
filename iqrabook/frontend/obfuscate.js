/**
 * IqraBook — Post-build code obfuscation
 * Runs after `next build` to protect course content and business logic.
 * Only obfuscates in production (NODE_ENV=production).
 * Skips: pyodide, three.js, monaco, mermaid (large libs — no need to obfuscate).
 */

const fs = require("fs");
const path = require("path");

// Only obfuscate in production
if (process.env.NODE_ENV !== "production") {
  console.log("[obfuscate] Skipping — not production build");
  process.exit(0);
}

// Check if javascript-obfuscator is installed
let JavaScriptObfuscator;
try {
  JavaScriptObfuscator = require("javascript-obfuscator");
} catch {
  console.log("[obfuscate] javascript-obfuscator not installed — skipping");
  process.exit(0);
}

const BUILD_DIR = path.join(__dirname, ".next", "static", "chunks");
const SKIP_PATTERNS = [
  "pyodide", "three", "monaco", "mermaid", "webpack",
  "framework", "polyfills", "react", "node_modules",
];

const OBFUSCATE_OPTIONS = {
  compact: true,
  controlFlowFlattening: false,    // Keep false — too slow on large files
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: true,
  identifierNamesGenerator: "hexadecimal",
  log: false,
  renameGlobals: false,
  rotateStringArray: true,
  selfDefending: false,            // Causes issues with Next.js chunks
  shuffleStringArray: true,
  splitStrings: false,
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 0.75,
  unicodeEscapeSequence: false,
};

function shouldSkip(filename) {
  return SKIP_PATTERNS.some((p) => filename.includes(p));
}

function obfuscateDir(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`[obfuscate] Dir not found: ${dir} — skipping`);
    return;
  }

  const files = fs.readdirSync(dir);
  let count = 0;

  for (const file of files) {
    if (!file.endsWith(".js")) continue;
    if (shouldSkip(file)) continue;

    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    // Skip very large files (> 500KB) — too slow to obfuscate
    if (stats.size > 500 * 1024) continue;

    try {
      const code = fs.readFileSync(filePath, "utf8");
      const result = JavaScriptObfuscator.obfuscate(code, OBFUSCATE_OPTIONS);
      fs.writeFileSync(filePath, result.getObfuscatedCode(), "utf8");
      count++;
    } catch (e) {
      // Non-fatal — skip this file
      console.warn(`[obfuscate] Skipped ${file}: ${e.message}`);
    }
  }

  console.log(`[obfuscate] Obfuscated ${count} files in ${dir}`);
}

console.log("[obfuscate] Starting post-build obfuscation...");
obfuscateDir(BUILD_DIR);
console.log("[obfuscate] Done!");
