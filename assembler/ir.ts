import {
  InstructionName,
  Register,
  RegisterName,
  instructions,
  opcodeByInstructionNameLookup,
  registerByNameLookup,
} from "../core/opcode.ts";
import { typeError, unexpectedToken } from "./error.ts";
import { LexerToken, TokenType } from "./lexer.ts";

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

export type IROffset = {
  type: "literal" | "register";
  value: number;
  sign: "+" | "-";
};

export type IRIntegerLiteralOperand = {
  type: "integer_literal";
  value: number;
  offset?: IROffset;
  token: LexerToken;
};

export type IRRegisterLiteralOperand = {
  type: "register_literal";
  value: Register;
  offset?: IROffset;
  token: LexerToken;
};

export type IRLabelOperand = {
  type: "label";
  value: string;
  offset?: IROffset;
  token: LexerToken;
};

export type IRConstOperand = {
  type: "const";
  value: string;
  offset?: IROffset;
  token: LexerToken;
};

export type IRNonConstOperand =
  | IRIntegerLiteralOperand
  | IRRegisterLiteralOperand
  | IRLabelOperand;

export type IROperand = IRNonConstOperand | IRConstOperand;

export type IRInstruction = {
  type: "instruction";
  name: keyof typeof opcodeByInstructionNameLookup;
  operands: IROperand[];
  token: LexerToken;
};

export type IRLabelDefinition = {
  type: "label_definition";
  name: string;
  token: LexerToken;
};

export type IRConstDefinition = {
  type: "const_definition";
  name: string;
  value: IRNonConstOperand;
  token: LexerToken;
};

export type IRImport = {
  type: "import";
  filename: string;
  token: LexerToken;
};

export type IRToken =
  | IRInstruction
  | IRLabelDefinition
  | IRConstDefinition
  | IRImport;

export class IRGenerator {
  index = 0;
  tokens: LexerToken[] = [];

  eof = () => this.tokens[this.tokens.length - 1];

  expect(type: TokenType): LexerToken {
    const token = this.tokens[this.index];
    if (!token) throw unexpectedToken(this.eof());

    if (token.type !== type) throw unexpectedToken(token);

    this.index++;
    return token;
  }

  expectRange(types: [TokenType]): LexerToken {
    const token = this.tokens[this.index];
    if (!token) throw unexpectedToken(this.eof());

    if (!types.includes(token.type)) throw unexpectedToken(token);

    this.index++;
    return token;
  }

  expectWithValue(type: TokenType, value: string): LexerToken {
    const token = this.expect(type);
    if (token.value !== value) throw unexpectedToken(token);
    return token;
  }

  peekNextToken(): LexerToken {
    if (this.tokens[this.index]) {
      return this.tokens[this.index];
    }

    return this.eof();
  }

  nextTokenIsType(type: TokenType): boolean {
    const nextToken = this.tokens[this.index];
    if (!nextToken) return false;
    return nextToken.type === type;
  }

  skipWhiteSpace() {
    if (this.peekNextToken()?.type === "whitespace") {
      this.expect("whitespace");
    }
  }

  parseOffset(): IROffset {
    this.expect("left_bracket");

    let sign: "+" | "-" = "+";

    let peek = this.peekNextToken();

    if (peek.type === "plus") {
      this.expect("plus");
    } else if (peek.type === "minus") {
      this.expect("minus");
      sign = "-";
    }

    peek = this.peekNextToken();

    if (peek.type !== "integer_literal" && peek.type !== "register_literal") {
      throw unexpectedToken(peek);
    }

    if (peek.type === "integer_literal") {
      this.expect("integer_literal");
      this.expect("right_bracket");

      return {
        type: "literal",
        value: parseInteger(peek.value),
        sign,
      };
    }

    this.expect("register_literal");
    this.expect("right_bracket");

    return {
      type: "register",
      value: registerByNameLookup[peek.value as RegisterName],
      sign,
    };
  }

  parseOperand(): IROperand {
    const peek = this.peekNextToken();

    switch (peek.type) {
      case "integer_literal": {
        const token = this.expect("integer_literal");
        const integer: IROperand = {
          type: "integer_literal",
          value: parseInteger(peek.value),
          token,
        };

        if (this.nextTokenIsType("left_bracket")) {
          integer.offset = this.parseOffset();
        }

        return integer;
      }
      case "register_literal": {
        const token = this.expect("register_literal");

        const register: IROperand = {
          type: "register_literal",
          value: registerByNameLookup[peek.value as RegisterName],
          token,
        };

        if (this.nextTokenIsType("left_bracket")) {
          register.offset = this.parseOffset();
        }

        return register;
      }
      case "label": {
        const token = this.expect("label");

        const label: IROperand = {
          type: "label",
          value: peek.value,
          token,
        };

        if (this.nextTokenIsType("left_bracket")) {
          label.offset = this.parseOffset();
        }

        return label;
      }

      case "const": {
        const token = this.expect("const");

        const label: IROperand = {
          type: "const",
          value: peek.value,
          token,
        };

        if (this.nextTokenIsType("left_bracket")) {
          label.offset = this.parseOffset();
        }

        return label;
      }

      default:
        throw unexpectedToken(peek);
    }
  }

  parseInstruction() {
    const token = this.expect("instruction");

    const name = token.value as InstructionName;
    const definition = instructions[name];
    if (!definition) throw unexpectedToken(token);

    this.skipWhiteSpace();

    // TODO: type check
    const instruction: IRToken = {
      type: "instruction",
      name: token.value as InstructionName,
      operands: [],
      token,
    };

    while (!this.nextTokenIsType("newline") && !this.nextTokenIsType("eof")) {
      const operand = this.parseOperand();
      instruction.operands.push(operand);
      this.skipWhiteSpace();
    }

    return instruction;
  }

  run(tokens: LexerToken[]): IRToken[] {
    this.tokens = tokens;
    let token = this.peekNextToken();

    const ir: IRToken[] = [];

    while (token.type !== "eof") {
      if (token.type === "instruction") {
        ir.push(this.parseInstruction());
        token = this.peekNextToken();
        continue;
      } else if (token.type === "keyword" && token.value === "const") {
        this.expect("keyword");
        this.skipWhiteSpace();
        const nameToken = this.expect("identifier");

        this.skipWhiteSpace();
        this.expect("equals");

        this.skipWhiteSpace();
        const value = this.parseOperand();
        if (value.type === "const") {
          throw typeError(
            value.token,
            `can't use const value in const definition`
          );
        }

        const constDef: IRToken = {
          type: "const_definition",
          name: nameToken.value,
          value,
          token: token,
        };

        ir.push(constDef);

        token = this.peekNextToken();
        continue;
      } else if (token.type === "keyword" && token.value === "import") {
        this.expect("keyword");
        this.skipWhiteSpace();
        const nameToken = this.expect("string");

        const fileImport: IRToken = {
          type: "import",
          filename: nameToken.value,
          token: token,
        };

        ir.push(fileImport);

        token = this.peekNextToken();
        continue;
      } else if (token.type === "label_definition") {
        this.expect("label_definition");
        const labelDef: IRToken = {
          type: "label_definition",
          name: token.value,
          token: token,
        };

        ir.push(labelDef);

        token = this.peekNextToken();
        continue;
      } else if (
        token.type === "comment" ||
        token.type === "newline" ||
        token.type === "whitespace"
      ) {
        this.index++;
        token = this.peekNextToken();
        continue;
      }

      throw unexpectedToken(token);
    }

    return ir;
  }
}
