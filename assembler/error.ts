import { makeExhaustive } from "../type-utils.ts";
import { LexerToken } from "./lexer.ts";

export type ParseError =
  | {
      type: "syntax_error";
      token: LexerToken;
    }
  | {
      type: "type_error";
      token: LexerToken;
      message: string;
    }
  | {
      type: "reference_error";
      token: LexerToken;
    };

export const unexpectedToken = (token: LexerToken): ParseError => ({
  type: "syntax_error",
  token,
});

export const typeError = (token: LexerToken, message: string): ParseError => ({
  type: "type_error",
  token,
  message,
});

export const referenceError = (token: LexerToken): ParseError => ({
  type: "reference_error",
  token,
});

export const isParseError = (error: { type?: ParseError["type"] }) =>
  error?.type === "syntax_error" ||
  error.type === "reference_error" ||
  error.type === "type_error";

export const getErrorMessage = (error: ParseError): string => {
  if (error.type === "syntax_error") {
    const { filename, line, col, value } = error.token;
    const val = value.split("\n")[0];
    return `unexpected token: '${val}' at ${filename}:${line}:${col}`;
  }

  if (error.type === "type_error") {
    const { filename, line, col } = error.token;
    return `type error: '${error.message}' at ${filename}:${line}:${col}`;
  }

  if (error.type === "reference_error") {
    const { filename, line, col, value } = error.token;
    return `reference error: no definition found for '${value}' at ${filename}:${line}:${col}`;
  }

  makeExhaustive(error);
  return "";
};
