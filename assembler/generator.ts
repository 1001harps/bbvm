import {
  AddressType,
  Offset,
  OffsetSign,
  OffsetType,
  Opcode,
  OperandType,
  Register,
  emptyOffset,
  encodeBranchingInstruction,
  encodeMemoryAccessInstruction,
  encodeSetInstruction,
  instructionWidth,
  opcodeByInstructionNameLookup,
} from "../core/opcode.ts";
import { makeExhaustive } from "../type-utils.ts";
import { referenceError, typeError } from "./error.ts";
import {
  IRConstOperand,
  IRInstruction,
  IRNonConstOperand,
  IROffset,
  IROperand,
  IRToken,
} from "./ir.ts";

// TODO: unify these types
const convertIROffset = (offset?: IROffset): Offset => {
  if (!offset) return emptyOffset();

  return {
    type: offset.type === "literal" ? OffsetType.Literal : OffsetType.Register,
    sign: offset.sign === "+" ? OffsetSign.Plus : OffsetSign.Minus,
    value: offset.value,
  };
};

export class CodeGenerator {
  labels: Record<string, number> = {};
  consts: Record<string, IRNonConstOperand> = {};

  registerLabelsAndConsts(ir: IRToken[]) {
    let i = 0;

    for (const token of ir) {
      switch (token.type) {
        case "instruction": {
          const opcode = opcodeByInstructionNameLookup[token.name];
          i += instructionWidth[opcode];
          break;
        }
        case "label_definition":
          this.labels[token.name] = i;
          break;
        case "const_definition":
          this.consts[token.name] = token.value;
          break;
        case "import":
          break;
        default:
          makeExhaustive(token);
      }
    }
  }

  generateArithmeticLogicInstruction({ name, operands }: IRInstruction) {
    const opcode = opcodeByInstructionNameLookup[name];

    const left = operands.at(0);
    if (!left) throw new Error("generateALU: left missing");

    if (left.type !== "register_literal")
      throw new Error("generateALU: left not register");

    let right = operands.at(1);
    if (!right) throw new Error("generateALU: right missing");

    if (right.type === "const") {
      right = this.resolveConst(right);
    }

    if (right.type === "label")
      throw new Error("generateALU: right can't be label");

    if (right.type === "register_literal") {
      return new Uint8Array([
        opcode,
        left.value,
        OperandType.Register,
        right.value,
      ]);
    }

    return new Uint8Array([
      opcode,
      left.value,
      OperandType.Literal,
      right.value,
    ]);
  }

  generateSetInstruction({ operands }: IRInstruction) {
    const destination = operands[0];
    if (destination.type !== "register_literal") {
      throw new Error("set failed");
    }

    const source = operands[1];

    if (source.type === "integer_literal") {
      return encodeSetInstruction({
        destination: destination.value,
        source: {
          type: OperandType.Literal,
          value: source.value,
        },
      });
    }

    if (source.type === "register_literal") {
      return encodeSetInstruction({
        destination: destination.value,
        source: {
          type: OperandType.Register,
          value: source.value,
        },
      });
    }

    throw new Error("set failed");
  }

  resolveLabelAddress(name: string) {
    if (!(name in this.labels)) throw new Error("undefined label");

    return this.labels[name];
  }

  resolveConst(operand: IRConstOperand): IRNonConstOperand {
    if (!(operand.value in this.consts)) throw referenceError(operand.token);
    const value = { ...this.consts[operand.value] };
    value.offset = operand.offset;
    return value;
  }

  // resolveLiteralValue(operand: IRConstOperand | IRIntegerLiteralOperand) {
  //   return operand.type === "const"
  //     ? this.resolveConst(operand)
  //     : operand.value;
  // }

  resolveAddress(operand: IROperand): number {
    if (operand.type === "const") {
      operand = this.resolveConst(operand);
    }

    if (operand.type === "register_literal") {
      throw typeError(
        operand.token,
        `${operand.value} can't be used as an address`
      );
    }

    if (operand.type === "label") {
      return this.resolveLabelAddress(operand.value);
    }

    return operand.value;
  }

  generateMemoryAccessInstruction({ name, operands }: IRInstruction) {
    const opcode = opcodeByInstructionNameLookup[name];
    if (opcode !== Opcode.Peek && opcode !== Opcode.Poke) {
      throw new Error("not memory access instruction");
    }

    const addressOperand = operands.at(0);
    if (!addressOperand) throw new Error("expected operand");

    if (addressOperand.type === "register_literal") {
      return encodeMemoryAccessInstruction(opcode, {
        type: AddressType.Register,
        value: addressOperand.value,
        offset: convertIROffset(addressOperand.offset),
      });
    }

    return encodeMemoryAccessInstruction(opcode, {
      type: AddressType.Literal,
      value: this.resolveAddress(addressOperand),
      offset: convertIROffset(addressOperand.offset),
    });
  }

  generateBranchingInstruction({ name, operands }: IRInstruction) {
    const opcode = opcodeByInstructionNameLookup[name];
    if (
      opcode !== Opcode.Call &&
      opcode !== Opcode.Jump &&
      opcode !== Opcode.JumpIfZero &&
      opcode !== Opcode.JumpIfNotZero
    ) {
      throw new Error("not branching instruction");
    }

    const addressOperand = operands.at(0);
    if (!addressOperand) throw new Error("expected operand");

    if (addressOperand.type === "register_literal")
      if (!addressOperand) throw new Error("invalid operand");

    const address = this.resolveAddress(addressOperand);

    return encodeBranchingInstruction(opcode, address);
  }

  generatePushInstruction({ operands }: IRInstruction) {
    let operand = operands.at(0);
    if (!operand) throw new Error("expected operand");
    if (operand.type === "const") {
      operand = this.resolveConst(operand);
    }

    if (operand.type === "label") throw new Error("invalid operand");

    if (operand.type === "register_literal") {
      return new Uint8Array([Opcode.Push, OperandType.Register, operand.value]);
    }

    return new Uint8Array([Opcode.Push, OperandType.Literal, operand.value]);
  }

  generatePopInstruction({ operands }: IRInstruction) {
    const operand = operands.at(0);
    if (!operand) {
      return new Uint8Array([Opcode.Pop, Register.A]);
    }

    if (operand.type !== "register_literal") throw new Error("invalid operand");

    return new Uint8Array([Opcode.Pop, operand.value]);
  }

  generateSyscallInstruction({ operands }: IRInstruction) {
    let operand = operands.at(0);
    if (!operand) throw new Error("expected operand");

    if (operand.type === "const") {
      operand = this.resolveConst(operand);
    }

    if (operand.type !== "integer_literal")
      throw typeError(
        operand.token,
        `'${operand.value}' is not a valid operand for syscall`
      );

    return new Uint8Array([Opcode.SysCall, operand.value]);
  }

  generateInstruction(token: IRInstruction): Uint8Array {
    switch (token.name) {
      case "halt":
        return new Uint8Array([Opcode.Halt]);
      case "+":
      case "-":
      case "*":
      case "/":
      case "<<":
      case ">>":
      case "==":
      case "!=":
      case "&":
      case "|":
      case "~":
        return this.generateArithmeticLogicInstruction(token);
      case "set":
        return this.generateSetInstruction(token);
      case "peek":
      case "poke":
        return this.generateMemoryAccessInstruction(token);
      case "jump":
      case "jump==0":
      case "jump!=0":
      case "call":
        return this.generateBranchingInstruction(token);
      case "return":
        return new Uint8Array([Opcode.Return]);
      case "push":
        return this.generatePushInstruction(token);
      case "pop":
        return this.generatePopInstruction(token);
      case "syscall":
        return this.generateSyscallInstruction(token);
      default:
        makeExhaustive(token.name);
    }

    throw new Error("invalid instruction");
  }

  program: number[] = [];

  pushInstruction(instruction: Uint8Array) {
    instruction.forEach((b) => this.program.push(b));
  }

  run(ir: IRToken[]): Uint8Array {
    // TODO: expand macros

    this.registerLabelsAndConsts(ir);

    for (const token of ir) {
      switch (token.type) {
        case "label_definition":
        case "const_definition":
        case "import":
          // skip
          continue;
        case "instruction":
          this.pushInstruction(this.generateInstruction(token));
          break;
        default:
          makeExhaustive(token);
      }
    }

    return new Uint8Array(this.program);
  }
}
