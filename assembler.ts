import {
  AddressType,
  OffsetSign,
  OffsetType,
  Opcode,
  OperandType,
  RegisterName,
  instructionWidth,
  opcodeByInstructionNameLookup,
  registerByNameLookup,
} from "./opcode.ts";

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
    pop: Opcode.Pop,
    return: Opcode.Return,
  };

  singleOpcodeWithAddressInstructions: Record<string, Opcode> = {
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

  parseOperandAndAddressInstruction(
    name: string,
    opcode: Opcode,
    operands: string[]
  ) {
    this.program.push(opcode);
    if (operands.length !== 1) {
      throw `${name}: expected operand`;
    }

    if (isNumber(operands[0])) {
      this.parseAndPushNumber16(operands[0]);
      return;
    }

    this.resolveAndPushLabelAddress(operands[0]);
  }

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

    if (instruction in this.singleOpcodeWithAddressInstructions) {
      this.parseOperandAndAddressInstruction(
        instruction,
        this.singleOpcodeWithAddressInstructions[instruction],
        operands
      );
      return;
    }

    if (instruction in this.arithmeticLogicInstructions) {
      this.parseArithmeticLogicInstruction(
        instruction,
        this.arithmeticLogicInstructions[instruction],
        operands
      );
      return;
    }

    if (instruction === "set") {
      this.program.push(Opcode.Set);
      if (operands.length !== 1) {
        throw "set: expected operand";
      }

      const [destination, source] = operands[0].split("=");

      if (!isRegister(destination)) {
        throw `set: expected register for destination, got ${destination}`;
      }

      this.program.push(registerByNameLookup[destination as RegisterName]);

      if (isNumber(source)) {
        this.program.push(OperandType.Literal);
        this.parseAndPushNumber(source);
        return;
      }

      if (isRegister(source)) {
        this.program.push(OperandType.Register);
        this.program.push(registerByNameLookup[source as RegisterName]);
        return;
      }

      throw `set: expected number or register for source, got ${source}`;
    }

    if (instruction === "peek") {
      this.program.push(Opcode.Peek);
      if (operands.length !== 1) {
        throw "peek: expected operand";
      }

      const offsetStartIndex = operands[0].indexOf("[");
      let addressSourceString = operands[0];
      if (offsetStartIndex !== -1) {
        addressSourceString = operands[0].substring(0, offsetStartIndex);
      }

      const addressSourceType = isRegister(addressSourceString)
        ? AddressType.Register
        : AddressType.Literal;

      let address = 0;

      if (
        addressSourceType === AddressType.Literal &&
        !isNumber(addressSourceString)
      ) {
        address = this.resolveLabelAddress(addressSourceString);
      } else {
        address = parseNumber(addressSourceString);
      }

      const addressSourceOperands =
        addressSourceType === AddressType.Register
          ? [
              AddressType.Register,
              registerByNameLookup[addressSourceString as RegisterName],
              0,
            ]
          : [AddressType.Literal, (address && 0xff00) >> 8, address && 0xff];

      // no offset
      if (offsetStartIndex === -1) {
        addressSourceOperands.forEach((o) => this.program.push(o));
        this.program.push(OffsetType.Literal);
        this.program.push(OffsetSign.Plus);
        this.program.push(0);
        return;
      }

      let offset = operands[0].substring(offsetStartIndex);
      if (!offset.startsWith("[") && !offset.endsWith("]")) {
        throw `peek: invalid offset: ${offset}`;
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

      const offsetSource = isRegister(offset)
        ? OffsetType.Register
        : OffsetType.Literal;

      const offsetValue =
        offsetSource == OffsetType.Register
          ? registerByNameLookup[offset as RegisterName]
          : parseNumber(offset) & 0xff;

      addressSourceOperands.forEach((o) => this.program.push(o));
      this.program.push(offsetSource);
      this.program.push(sign);
      this.program.push(offsetValue);

      return;
    }

    if (instruction === "poke") {
      this.program.push(Opcode.Poke);
      if (operands.length !== 1) {
        throw "peek: expected operand";
      }

      const offsetStartIndex = operands[0].indexOf("[");
      let addressSourceString = operands[0];
      if (offsetStartIndex !== -1) {
        addressSourceString = operands[0].substring(0, offsetStartIndex);
      }

      const addressSourceType = isRegister(addressSourceString)
        ? AddressType.Register
        : AddressType.Literal;

      let address = 0;

      if (
        addressSourceType === AddressType.Literal &&
        !isNumber(addressSourceString)
      ) {
        address = this.resolveLabelAddress(addressSourceString);
      } else {
        address = parseNumber(addressSourceString);
      }

      const addressSourceOperands =
        addressSourceType === AddressType.Register
          ? [
              AddressType.Register,
              registerByNameLookup[addressSourceString as RegisterName],
              0,
            ]
          : [AddressType.Literal, (address && 0xff00) >> 8, address && 0xff];

      // no offset
      if (offsetStartIndex === -1) {
        addressSourceOperands.forEach((o) => this.program.push(o));
        this.program.push(OffsetType.Literal);
        this.program.push(OffsetSign.Plus);
        this.program.push(0);
        return;
      }

      let offset = operands[0].substring(offsetStartIndex);
      if (!offset.startsWith("[") && !offset.endsWith("]")) {
        throw `peek: invalid offset: ${offset}`;
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

      const offsetSource = isRegister(offset)
        ? OffsetType.Register
        : OffsetType.Literal;

      const offsetValue =
        offsetSource == OffsetType.Register
          ? registerByNameLookup[offset as RegisterName]
          : parseNumber(offset) & 0xff;

      addressSourceOperands.forEach((o) => this.program.push(o));
      this.program.push(offsetSource);
      this.program.push(sign);
      this.program.push(offsetValue);

      return;
    }

    if (instruction === "push") {
      this.program.push(Opcode.Push);
      if (operands.length !== 1) {
        throw "push: expected operand";
      }

      if (isNumber(operands[0])) {
        this.program.push(OperandType.Literal);
        this.parseAndPushNumber(operands[0]);
        return;
      }

      if (isRegister(operands[0])) {
        this.program.push(OperandType.Register);
        this.program.push(registerByNameLookup[operands[0] as RegisterName]);
      }

      return;
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
