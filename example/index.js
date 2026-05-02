import { createVerifier } from "codeverify";
import eslint from "@codeverify/eslint";
import zls from "@codeverify/zls";

const verifier = createVerifier();

verifier.use(eslint);
verifier.use(zls);

// --- Test Zig ---
const zigResult = await verifier.verify("./test_files/test.zig");

console.log("=== Zig Result ===");
console.log(JSON.stringify(zigResult, null, 2));

// --- Test JavaScript ---
const jsResult = await verifier.verify("./test_files/test.js");

console.log("\n=== JS Result ===");
console.log(JSON.stringify(jsResult, null, 2));
