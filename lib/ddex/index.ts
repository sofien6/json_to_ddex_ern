import { buildErn43 } from "./ern43";
import type { ConversionInput, ConversionResult } from "./types";
import { validate } from "./validate";

export { ERN_VERSION } from "./ern43";
export { SAMPLE_INPUT } from "./sample";
export type * from "./types";

/** Validates the input and, if there are no errors, builds an ERN 4.3 NewReleaseMessage. */
export function convertToDdex(input: unknown): ConversionResult {
  const issues = validate(input);
  if (issues.some((i) => i.severity === "error")) return { xml: null, issues };
  return { xml: buildErn43(input as ConversionInput), issues };
}
