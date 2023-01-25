/*
 * ESM wrapper for "./lib.js"
 */
// Module exports
import {parseableRange, sanitizeLiteral} from "./lib.js";
export default sanitizeLiteral;
export {
  parseableRange,
  sanitizeLiteral
};
// Type exports
import type { charset, sanitizeResult, unknownLiteral } from "./lib.js";
export type {
  charset,
  sanitizeResult,
  unknownLiteral
};