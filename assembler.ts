import {
  AddressType,
  OffsetSign,
  OffsetType,
  Opcode,
  OperandType,
  Register,
  RegisterName,
  emptyOffset,
  Offset,
  encodeMemoryAccessInstruction,
  instructionWidth,
  opcodeByInstructionNameLookup,
  registerByNameLookup,
  BranchingInstructionOpcode,
  encodeBranchingInstruction,
  encodeSetInstruction,
  Operand,
} from "./core/opcode.ts";

export const isNumber = (s: string) => {
  if (s.match(/^\d/)) {
    return true;
  }

  return false;
};

export const parseNumber = (s: string) => {
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

export const isRegister = (s: string) => {
  return s in RegisterName;
};

export class Assembler {
  program: number[] = [];

  singleOpcodeInstructions: Record<string, Opcode> = {
    halt: Opcode.Halt,
    return: Opcode.Return,
  };

  branchingInstructions: Record<string, Opcode> = {
    call: Opcode.Call,
    jump: Opcode.Jump,
    "jump==0": Opcode.JumpIfZero,
    "jump!=0": Opcode.JumpIfNotZero,
  };

  arithmeticLogicInstructions: Record<string, Opcode> = {
    "+": Opcode.Add,
    "-": Opcode.Subtract,
    "*": Opcode.Multiply,
    "/": Opcode.Divide,
    "<<": Opcode.ShiftLeft,
    ">>": Opcode.ShiftRight,
    "==": Opcode.EqualTo,
    "!=": Opcode.NotEqualTo,
    "&": Opcode.And,
    "|": Opcode.Or,
    "~": Opcode.Not,
  };

  labels: Record<string, number> = {};

  parseAndPushNumber(s: string) {
    const value = parseNumber(s);
    const n = value & 0xff;
    this.program.push(n);
  }

  parseAndPushNumber16(s: string) {
    const value = parseNumber(s);
    const h = (value & 0xff00) >> 8;
    const l = value & 0xff;

    this.program.push(h);
    this.program.push(l);
  }

  resolveLabelAddress(label: string) {
    if (!(label in this.labels)) {
      throw `missing definition for label: ${label}`;
    }
    const address = this.labels[label];
    return address;
  }

  resolveAndPushLabelAddress(label: string) {
    const address = this.resolveLabelAddress(label);
    const h = (address & 0xff00) >> 8;
    const l = address & 0xff;
    this.program.push(h);
    this.program.push(l);
  }

  registerLabelAddresses(source: string) {
    const lines = source.split("\n");

    let address = 0;

    for (let line of lines) {
      line = line.trim();
      if (line === "") continue;

      if (line.endsWith(":")) {
        this.labels[line.substring(0, line.length - 1)] = address;
      } else if (line.startsWith("//")) {
        // skip comments
      } else {
        const [instruction] = line.split(/\s+/);
        const opcode = opcodeByInstructionNameLookup[instruction];
        if (opcode !== 0 && !opcode)
          throw `encountered unknown instruction: ${instruction}`;
        address += instructionWidth[opcode];
      }
    }
  }

  pushInstruction(instruction: Uint8Array) {
    instruction.forEach((b) => this.program.push(b));
  }

  resolveAddressString(address: string) {
    if (isNumber(address)) {
      return parseNumber(address);
    }

    return this.resolveLabelAddress(address);
  }

  parseMemoryAccessInstruction(
    opcode: Opcode.Peek | Opcode.Poke,
    operands: string[]
  ) {
    if (operands.length !== 1) {
      throw "expected operand";
    }

    const offsetStartIndex = operands[0].indexOf("[");
    let addressSourceString = operands[0];
    if (offsetStartIndex !== -1) {
      addressSourceString = operands[0].substring(0, offsetStartIndex);
    }

    // get type
    const type = isRegister(addressSourceString)
      ? AddressType.Register
      : AddressType.Literal;

    // get value
    const value =
      type === AddressType.Literal
        ? this.resolveAddressString(addressSourceString)
        : registerByNameLookup[addressSourceString as RegisterName];

    // get offset
    const hasOffset = offsetStartIndex !== -1;
    const offset = hasOffset
      ? this.parseOffsetString(operands[0].substring(offsetStartIndex))
      : emptyOffset();

    const instruction = encodeMemoryAccessInstruction(opcode, {
      type,
      value,
      offset,
    });

    instruction.forEach((o) => this.program.push(o));
  }

  parseOffsetString = (offset: string): Offset => {
    if (!offset.startsWith("[") && !offset.endsWith("]")) {
      throw `invalid offset: ${offset}`;
    }

    offset = offset.substring(1, offset.length - 1);

    let sign = OffsetSign.Plus;
    const hasSign = offset[0] === "-" || offset[0] === "+";

    if (hasSign) {
      if (offset[0] === "-") {
        sign = OffsetSign.Minus;
      }

      offset = offset.substring(1);
    }

    const type = isRegister(offset) ? OffsetType.Register : OffsetType.Literal;

    const value =
      type == OffsetType.Register
        ? registerByNameLookup[offset as RegisterName]
        : parseNumber(offset) & 0xff;

    return {
      type,
      sign,
      value,
    };
  };

  parseArithmeticLogicInstruction(
    name: string,
    opcode: Opcode,
    operands: string[]
  ) {
    this.program.push(opcode);
    if (operands.length !== 2) {
      throw `${name}: expected 2 operands`;
    }

    if (!isRegister(operands[0])) {
      throw `${name}: first operand must be register`;
    }

    const registerA = registerByNameLookup[operands[0] as RegisterName];
    this.program.push(registerA);

    if (isRegister(operands[1])) {
      this.program.push(OperandType.Register);
      const registerB = registerByNameLookup[operands[1] as RegisterName];
      this.program.push(registerB);
    } else {
      if (!isNumber(operands[1])) {
        throw `${name}: ${operands[1]} is not a valid number`;
      }

      this.program.push(OperandType.Literal);
      this.parseAndPushNumber(operands[1]);
    }
  }

  parseOperand(operandString: string): Operand {
    const type = isNumber(operandString)
      ? OperandType.Literal
      : OperandType.Register;

    const value =
      type === OperandType.Literal
        ? parseNumber(operandString)
        : registerByNameLookup[operandString as RegisterName];

    return {
      type,
      value,
    };
  }

  parseSetInstruction(operands: string[]) {
    if (operands.length !== 1) {
      throw "set: expected operand";
    }

    const [destinationString, sourceString] = operands[0].split("=");

    if (!isRegister(destinationString)) {
      throw `set: expected register for destination, got ${destinationString}`;
    }

    const destination = registerByNameLookup[destinationString as RegisterName];

    const source = this.parseOperand(sourceString);

    this.pushInstruction(encodeSetInstruction({ destination, source }));
  }

  parsePushInstruction(operands: string[]) {
    if (operands.length !== 1) {
      throw "push: expected operand";
    }

    const operand = this.parseOperand(operands[0]);

    this.program.push(Opcode.Push);
    this.program.push(operand.type);
    this.program.push(operand.value);
  }

  parseLine(line: string) {
    line = line.trim();

    if (line === "") {
      return;
    }

    if (line.startsWith("//")) {
      // skip comments
      return;
    }

    const [instruction, ...operands] = line.split(/\s+/);
    // skip labels
    if (instruction.endsWith(":")) {
      return;
    }

    if (instruction in this.singleOpcodeInstructions) {
      this.program.push(this.singleOpcodeInstructions[instruction]);
      return;
    }

    if (instruction in this.branchingInstructions) {
      if (operands.length !== 1) {
        throw `${instruction}: expected operand`;
      }

      const opcode = this.branchingInstructions[
        instruction
      ] as BranchingInstructionOpcode;

      const address = this.resolveAddressString(operands[0]);
      this.pushInstruction(encodeBranchingInstruction(opcode, address));
      return;
    }

    if (instruction in this.arithmeticLogicInstructions) {
      const opcode = this.arithmeticLogicInstructions[instruction];
      this.parseArithmeticLogicInstruction(instruction, opcode, operands);
      return;
    }

    if (instruction === "set") {
      this.parseSetInstruction(operands);
      return;
    }

    if (instruction === "peek") {
      this.parseMemoryAccessInstruction(Opcode.Peek, operands);
      return;
    }

    if (instruction === "poke") {
      this.parseMemoryAccessInstruction(Opcode.Poke, operands);
      return;
    }

    if (instruction === "push") {
      this.parsePushInstruction(operands);
      return;
    }

    if (instruction === "pop") {
      this.program.push(Opcode.Pop);

      if (operands.length >= 1) {
        if (isRegister(operands[0])) {
          this.program.push(registerByNameLookup[operands[0] as RegisterName]);
          return;
        }

        throw `pop: expected register, got '${operands[0]}'`;
      }

      this.program.push(Register.A);
      return;
    }

    if (instruction === "syscall") {
      this.program.push(Opcode.SysCall);
      if (operands.length !== 1) {
        throw "syscall: expected operand";
      }

      if (isNumber(operands[0])) {
        this.parseAndPushNumber(operands[0]);
        return;
      }

      throw "syscall: expected number";
    }

    throw `encountered unknown instruction: ${instruction}`;
  }

  run(source: string) {
    const lines = source.split("\n");

    this.registerLabelAddresses(source);

    for (const line of lines) {
      this.parseLine(line);
    }

    return new Uint8Array(this.program);
  }
}
