import {
  Register,
  RegisterName,
  registerByNameLookup,
} from "../core/opcode.ts";
import { Token, TokenType } from "./lexer.ts";

export const parseInteger = (s: string) => {
  if (s.startsWith("0b")) {
    const n = s.substring(2);
    return parseInt(n, 2);
  }

  if (s.startsWith("0x")) {
    const n = s.substring(2);
    return parseInt(n, 16);
  }

  return parseInt(s);
};

export type Offset = {
  type: "literal" | "register";
  value: number;
  sign: "+" | "-";
};

export type IROperand =
  | {
      type: "integer_literal";
      value: number;
      offset?: Offset;
    }
  | {
      type: "register_literal";
      value: Register;
    }
  | {
      type: "label";
      value: string;
      offset?: Offset;
    };

export type IRInstruction = {
  type: "instruction";
  name: string;
  operands: IROperand[];
  token: Token;
};

export type IRLabelDefinition = {
  type: "label_definition";
  name: string;
  token: Token;
};

export type IRConstDefinition = {
  type: "const_definition";
  name: string;
  value: IROperand;
  token: Token;
};

export type IRToken = IRInstruction | IRLabelDefinition | IRConstDefinition;

export class IRGenerator {
  index = 0;
  tokens: Token[] = [];

  currentToken() {
    return this.tokens[this.index];
  }

  nextToken() {
    this.index++;
    return this.tokens[this.index];
  }

  peekNextToken() {
    return this.tokens[this.index + 1];
  }

  skipWhiteSpace() {
    while (this.peekNextToken()?.type === "whitespace") {
      this.nextToken();
    }
  }

  expect(type: TokenType) {
    const token = this.currentToken();

    if (token.type !== type) {
      throw `expected type ${type}, got ${token}`;
    }

    return token;
  }

  expectNext(type: TokenType) {
    const token = this.nextToken();
    if (token.type !== type) {
      throw `expected type ${type}, got ${token}`;
    }

    return token;
  }

  parseOffset(): Offset {
    this.expect("left_bracket");

    let sign: "+" | "-" = "+";

    let token = this.nextToken();

    if (token.type === "plus") {
      token = this.nextToken();
    }

    if (token.type === "minus") {
      sign = "-";
      token = this.nextToken();
    }

    if (token.type !== "integer_literal" && token.type !== "register_literal") {
      throw `unexpected token: ${token.value}`;
    }

    this.expectNext("right_bracket");

    if (token.type === "integer_literal") {
      return {
        type: "literal",
        value: parseInteger(token.value),
        sign,
      };
    }

    return {
      type: "register",
      value: registerByNameLookup[token.value as RegisterName],
      sign,
    };
  }

  parseOperand(): IROperand {
    const token = this.currentToken();

    switch (token.type) {
      case "integer_literal":
        return {
          type: "integer_literal",
          value: parseInteger(token.value),
        };
      case "register_literal":
        return {
          type: "register_literal",
          value: registerByNameLookup[token.value as RegisterName],
        };
      case "label": {
        const label: IROperand = {
          type: "label",
          value: token.value,
        };

        const hasOffset = this.peekNextToken()?.type === "left_bracket";

        if (hasOffset) {
          this.nextToken();
          label.offset = this.parseOffset();
        }

        return label;
      }
      default:
        throw "invalid operand: " + token.type;
    }
  }

  run(tokens: Token[]): IRToken[] {
    this.tokens = tokens;

    let token = this.currentToken();

    const ir: IRToken[] = [];

    while (token) {
      if (token.type === "instruction") {
        const instruction: IRToken = {
          type: "instruction",
          name: token.value,
          operands: [],
          token,
        };

        this.skipWhiteSpace();

        token = this.nextToken();
        if (!token) {
          ir.push(instruction);
          break;
        }

        while (token && token.type !== "newline") {
          const operand = this.parseOperand();
          instruction.operands.push(operand);
          this.skipWhiteSpace();
          token = this.nextToken();
        }

        this.nextToken();

        ir.push(instruction);

        // skip newline
        this.nextToken();

        token = this.nextToken();
        continue;
      } else if (token.type === "keyword" && token.value === "const") {
        this.skipWhiteSpace();
        const nameToken = this.expectNext("identifier");

        this.skipWhiteSpace();
        this.expectNext("equals");

        this.skipWhiteSpace();
        this.nextToken();
        const value = this.parseOperand();

        const constDef: IRToken = {
          type: "const_definition",
          name: nameToken.value,
          value,
          token,
        };

        ir.push(constDef);

        token = this.nextToken();
        continue;
      } else if (token.type === "label_definition") {
        const labelDef: IRToken = {
          type: "label_definition",
          name: token.value,
          token,
        };

        ir.push(labelDef);

        token = this.nextToken();
        continue;
      }

      throw "unexpdced token: " + token;
    }

    return ir;
  }
}
