import {
  Lexer as MooLexer,
  type Token as MooToken,
} from "https://deno.land/x/moo@0.5.1-deno.2/mod.ts";
import moo from "https://deno.land/x/moo@0.5.1.1/index.ts";
import { RegisterName, opcodeByInstructionNameLookup } from "../core/opcode.ts";
import { unexpectedToken } from "./error.ts";

const register_literal = Object.keys(RegisterName);
const integer_literal = /0x[0-9a-fA-F]+|0b[01]+|\d+/;

const main = {
  whitespace: /[ \t]+/,
  comment: /\/\/.*?$/,
  instruction: Object.keys(opcodeByInstructionNameLookup),
  left_bracket: { match: "[", push: "offset" },
  equals: "=",
  keyword: ["const", "import"],
  string: {
    match: /"(?:\\["\\]|[^\n"\\])*"/,
    value: (x: string) => x.slice(1, x.length - 1),
  },
  label_definition: {
    match: /\#\w+\:/,
    lineBreaks: true,
    value: (x: string) => x.slice(1, x.length - 1),
  },
  label: {
    match: /\#\w+/,
    lineBreaks: true,
    value: (x: string) => x.slice(1, x.length),
  },
  const: {
    match: /\$\w+/,
    lineBreaks: true,
    value: (x: string) => x.slice(1, x.length),
  },
  register_literal,
  integer_literal,
  identifier: /\w+/,
  newline: { match: /\n/, lineBreaks: true },
  syntax_error: moo.error,
};

const offset = {
  plus: "+",
  minus: "-",
  register_literal,
  integer_literal,
  right_bracket: { match: "]", pop: 1 },
  syntax_error: moo.error,
};

const rules = {
  main,
  offset,
};

const lexer = moo.states(rules);

export type TokenType = keyof typeof main | keyof typeof offset | "eof";

export interface LexerToken extends Omit<MooToken, "type"> {
  type: TokenType;
  filename: string;
}

function* withEof(lexer: MooLexer) {
  yield* lexer;
  yield Object.assign({
    type: "eof",
    value: "<eof>",
    toString() {
      return "<eof>";
    },
    // @ts-ignore
    offset: lexer.index,
    size: 0,
    lineBreaks: 0,
    // @ts-ignore
    line: lexer.line,
    // @ts-ignore
    col: lexer.col,
  });
}

export class Lexer {
  run(filename: string, source: string): LexerToken[] {
    const lexerWithEof = withEof(lexer.reset(source));
    const tokens: LexerToken[] = Array.from(lexerWithEof).map((x) => ({
      ...x,
      type: x.type as TokenType,
      filename,
    }));

    const error = tokens.find((x) => x.type === "syntax_error");

    if (error) {
      throw unexpectedToken(error);
    }

    return tokens;
  }
}
