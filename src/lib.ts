/*------------------------------------------------------*
 * Copyright (c) 2023 Dawid Papiewski "SpacingBat3".    *
 *                                                      *
 * All rights reserved. Licensed under the ISC license. *
 *------------------------------------------------------*/

/**
 * Sets of chars that are correctly understood by current engine and can be
 * transformed to valid {@link charset}.
 * 
 * @since v1.0.0
 */
export const parseableRange = Object.freeze(["a-z","A-Z","0-9","---"] as const);

/**
 * Like `unknown`, except it includes some primitive type just so generics can
 * pick any commonly-used primitive type.
 */
export type unknownLiteral = null|undefined|object|string|number|bigint;

type stringify<T> = T extends number ? `${T}` : T extends string ? T : string;

/**
 * Splits `T` to the union of chars. If `T` is an empty string, it resolves to
 * `never`.
 */
export type charset<T extends string> = (
  T extends `${infer C extends string}${infer R extends string}` ? (
    C | charset<R>
  ) : T extends "" ? never : T
);

/**
 * A union of letters from English alphabet (lowercase).
 */
type char = charset<"abcdefghijklmnopqrstuvwxyz">;

/**
 * A union of arabic numbers (i.e. decimal number system).
 */
type digit = charset<"0123456789">;

type parseableRange = (typeof parseableRange)[number];

/**
 * Maps given {@link parseableRange} to {@link charset}.
 */
type extendRange<T extends parseableRange> = (
  T extends "a-z" ? char : T extends "A-Z" ? Uppercase<char> : (
    T extends "0-9" ? digit : T extends "---" ? "-" : never
  )
);

type range2charset<T extends string> = T extends parseableRange ? extendRange<T> : (
  // a-z
  T extends `${infer F extends "a-z"}${string}` ? (
    T extends `${F}${infer R extends string}` ? extendRange<F>|range2charset<R> : never
  // A-Z
  ) : T extends `${infer F extends "A-Z"}${string}` ? (
    T extends `${F}${infer R extends string}` ? extendRange<F>|range2charset<R> : never
  // 0-9
  ) : T extends `${infer F extends "0-9"}${string}` ? (
    T extends `${F}${infer R extends string}` ? extendRange<F>|range2charset<R> : never
  // any char
  ) : T extends `${infer F extends string}${infer R extends string}` ? (
    charset<F>|range2charset<R>
  // empty string
  ) : never
);

type _case<T extends string,C extends string> = (
  // Charset contains any letter from English alphabet?
  C extends `${string}${char}${string}` ? (
    // Charset contains any upperCase English letter?
    C extends `${string}${Uppercase<char>}${string}` ? T : Lowercase<T>
  ) : Uppercase<T>
);
/**
 * A generic type which modifies literal string to replace `T` string with `R`
 * replacement character based on `C` charset. It should work exactly the same
 * as runtime function does when combined with {@link _slice}.
 */
type _replace<T extends string,C extends string,R extends string> = (
  // F <- T[0], S <- T[1..N]
  T extends `${infer F extends string}${infer S extends string}` ? (
    // Leave valid chars as-is:
    F extends range2charset<C> ? (
      `${F}${_replace<S,C,R>}`
    // Replace invalid chars with replacement character:
    ) : `${R}${_replace<S,C,R>}`
  // Original type on empty or non-literal strings.
  ) : T
);
/**
 * Looks for the first occurance of char in `C` charset and slices string to it.
 * It should provide the same logic as in runtime function.
 * 
 * @template T - A value to be sliced.
 * @template C - A charset used during sanitization.
 */
type _slice<T extends string,C extends string> = (
  T extends `${infer F extends string}${infer R extends string}` ? (
    F extends range2charset<C> ? T : _slice<R,C>
  ) : T
);
/**
 * Ensures given string is a *char* (i.e. has `length === 1`). It will resolve
 * to `never` both for strings with multiple characters and empty strings.
 * 
 * @template T - any `string`.
 */
type ensureChar<T extends string> = (
  T extends `${infer P extends string}${string}` ? (
    T extends P ? T : never
  ) : never
);

/** Ensures given string is non-empty. Resolves to `never` otherwise. */
type ensureNonEmpty<T extends string> = T extends "" ? never : T;

/** Resolves to last character from the given string. */
type lastChar<T extends string> = (
  T extends `${string}${infer R extends string}` ? (
    R extends "" ? T : lastChar<R>
  ) : T
);

/** Infers a set of chars from given string as a union type. */
type charGroups<T extends string> = (
  T extends `${infer S extends string}-${infer E extends string}${infer R extends string}` ? (
    S extends "" ? charGroups<R> : `${lastChar<S>}-${E}`|charGroups<R>
  ) : never
);

/**
 * Transforms {@link sanitizeResult} function parameters to provide an expected
 * result type for a given set of literals.
 * 
 * @template V - Value to be sanitized.
 * @template C - A charset to be used for sanitization.
 * @template R - A replacement character to be used for sanitization.
 */
export type sanitizeResult<V,C extends string,R extends string> = (
  V extends null|undefined ? V : R extends ensureChar<R> ? (
    charGroups<C> extends parseableRange ? V extends string|number ? (
      ensureNonEmpty<_replace<_slice<_case<stringify<V>,C>,C>,C,R>>
    ) : string : never
  ) : never
);

/**
 * A type-safe string sanitizer supporting any set of chars while being capable
 * of calculating the expected result as a static type if literal is provided as
 * a name.
 * 
 * @remarks
 * 
 * It is designed to be rather performant at runtime (it uses [`RegExp`]
 * under-the-hood), however be aware of long compilation times as TypeScript
 * will have to do heavy calculations for function result in case of complex
 * strings and character sets (a lot of operations are done in char-by-char
 * manner, using type recursion — there's a real chance that for long strings
 * TypeScript will just give up at calculations and end compilation with an
 * error!). There are also no complete guarantees types will be accurate for all
 * cases, althrough that should be considered as a bug.
 * 
 * [`RegExp`]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp "RegExp – JavaScript | MDN"
 * 
 * @privateRemarks
 * 
 * This function began, for me and anyone digging into the source code, as a
 * resource for learning advanced TypeScript manipulations on string literals.
 * I will also use it for my own personal projects.
 * 
 * @param value - Value to sanitize. Should be a *non-nullish* `string`.
 * @param charset - A string that represents a set of characters. For ranges, only values from {@link parseableRange} are valid.
 * @param replacement - A `char` (i.e. `string` with `length === 0`) which should replace invalid characters inside the string.
 * 
 * @returns - Original {@link value} for nullish values, sanitized string for anything else.
 * @throws  - [`TypeError`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError "TypeError – JavaScript | MDN") for unresolveable {@link charset}, [`RangeError`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError "RangeError – JavaScript | MDN") for non-char values in {@link replacement} and [`Error`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error "Error – JavaScript | MDN") for {@link value} which cannot be sanitized to the expected {@link charset}.
 * 
 * @example
 * 
 * // (const) regular: "fooBar3"
 * const regular = "fooBar3" as const;
 * // (const) mod1: "FOOBAR3"
 * const mod1 = sanitizeLiteral(regular,"A-Z0-9");
 * // (const) mod2: "foobarz"
 * const mod2 = sanitizeLiteral(regular,"a-z","z");
 * // (const) mod3: "oo_ar3"
 * const mod3 = sanitizeLiteral(regular,"acdeghijklmnopqrstuvwxyz0-9","_");
 * 
 * @since v1.0.0
 */
export function sanitizeLiteral<V extends unknownLiteral,C extends string = "a-z0-9",R extends string = "-">(value:V, charset="a-z0-9" as C, replacement="-" as R): sanitizeResult<V,C,R> {
  if(value === null || value === undefined)
    return value as sanitizeResult<V,C,R>;
  if((charset.match(/([^])-([^])/gm)??[]).find(element => !["a-z","A-Z","0-9","---"].includes(element)) !== undefined)
    throw new TypeError(`Unrecognized charset: "${charset}"!`);
  if(replacement.length !== 1)
    throw new RangeError("Parameter 'replacement' should be a valid character");
  charset = charset.replaceAll(/([\]^\\])/g,"\\$1") as C;
  let valueString:string;
  const regexp = {
    valid: new RegExp(`[${charset}]`),
    invalid: new RegExp(`[^${charset}${replacement.replaceAll("]","\\]")}]`,"g")
  }
  if(typeof value !== "string")
    valueString = String(value);
  else
    valueString = value;
  if(regexp.invalid.test(valueString)||valueString.startsWith(replacement)) {
    // Try to convert string to uppercase or lowercase based on charset.
    valueString = !/[A-Z]/.test(charset) ? valueString.toLowerCase() :
      !/[a-z]/.test(charset) ? valueString.toUpperCase() : valueString;
    // A string sanitization logic
    valueString = valueString
      // Slice to the nearest valid character.
      .slice(valueString.search(regexp.valid))
      // Replace the rest with the replacement character.
      .replaceAll(regexp.invalid,replacement)
  }
  // Do not accept the empty strings 
  if(valueString.length === 0)
    throw new Error("Parameter 'name' is not sanitizable!");
  return valueString as sanitizeResult<V,C,R>;
}

export default sanitizeLiteral;