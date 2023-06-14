import moo from "https://deno.land/x/moo@0.5.1.1/index.ts";
import { RegisterName, opcodeByInstructionNameLookup } from "../core/opcode.ts";
import { type Token as MooToken } from "https://deno.land/x/moo@0.5.1-deno.2/mod.ts";

const rules = {
  whitespace: /[ \t]+/,
  comment: /\/\/.*?$/,
  left_bracket: "[",
  right_bracket: "]",
  plus: "+",
  minus: "-",
  equals: "=",
  keyword: ["const"],
  instruction: Object.keys(opcodeByInstructionNameLookup),
  label_definition: {
    match: /\$\w+\:/,
    lineBreaks: true,
    value: (x: string) => x.slice(1, x.length - 1),
  },
  label: {
    match: /\$\w+/,
    lineBreaks: true,
    value: (x: string) => x.slice(1, x.length),
  },
  register_literal: Object.keys(RegisterName),
  integer_literal: /0x[0-9a-fA-F]+|0b[01]+|\d+/,
  identifier: /\w+/,
  newline: { match: /\n/, lineBreaks: true },
};

const lexer = moo.compile(rules);

export type TokenType = keyof typeof rules;

export interface Token extends Omit<MooToken, "type"> {
  type: TokenType;
  filename: string;
}

export class Lexer {
  run(filename: string, source: string): Token[] {
    const l = lexer.reset(source);

    return Array.from(l).map((x) => ({
      ...x,
      type: x.type as TokenType,
      filename,
    }));
  }
}
