import { createVerifier } from "codeverify";
import eslint from "@codeverify/eslint";
import zls from "@codeverify/zls";
import path from "path";

const verifier = createVerifier();

verifier.use(eslint);
verifier.use(zls);

// --- Test Zig ---
const zigPath = path.resolve("./test_files/test.zig");
const zigResult = await verifier.verify(zigPath);

console.log("=== Zig Result ===");
console.log(JSON.stringify(zigResult, null, 2));

// --- Test JavaScript ---
const jsPath = path.resolve("./test_files/test.js");
const jsResult = await verifier.verify(jsPath);

console.log("\n=== JS Result ===");
console.log(JSON.stringify(jsResult, null, 2));
