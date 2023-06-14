export enum OperandType {
  Literal,
  Register,
  Address,
}

export enum Register {
  A,
  X,
  Y,
  XY,
  IP,
  SP,
  FP,
}

export enum RegisterName {
  a = "a",
  x = "x",
  y = "y",
  xy = "xy",
  ip = "ip",
  sp = "sp",
  fp = "fp",
}

export const registerByNameLookup: Record<RegisterName, Register> = {
  a: Register.A,
  x: Register.X,
  y: Register.Y,
  xy: Register.XY,
  ip: Register.IP,
  sp: Register.SP,
  fp: Register.FP,
};

export enum Opcode {
  Halt,

  Set,
  Peek,
  Poke,

  Add,
  Subtract,
  Multiply,
  Divide,
  ShiftLeft,
  ShiftRight,
  EqualTo,
  NotEqualTo,
  And,
  Or,
  Not,

  Jump,
  JumpIfZero,
  JumpIfNotZero,

  Call,
  Return,

  Push,
  Pop,

  SysCall,
}

export const opcodeByInstructionNameLookup: Record<string, Opcode> = {
  halt: Opcode.Halt,
  set: Opcode.Set,
  peek: Opcode.Peek,
  poke: Opcode.Poke,
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
  jump: Opcode.Jump,
  "jump==0": Opcode.JumpIfZero,
  "jump!=0": Opcode.JumpIfNotZero,
  call: Opcode.Call,
  return: Opcode.Return,
  push: Opcode.Push,
  pop: Opcode.Pop,
  syscall: Opcode.SysCall,
};

export const instructionWidth: Record<Opcode, number> = {
  [Opcode.Halt]: 1,
  [Opcode.Set]: 4,
  [Opcode.Peek]: 7,
  [Opcode.Poke]: 7,
  [Opcode.Add]: 4,
  [Opcode.Subtract]: 4,
  [Opcode.Multiply]: 4,
  [Opcode.Divide]: 4,
  [Opcode.ShiftLeft]: 4,
  [Opcode.ShiftRight]: 4,
  [Opcode.EqualTo]: 4,
  [Opcode.NotEqualTo]: 4,
  [Opcode.And]: 4,
  [Opcode.Or]: 4,
  [Opcode.Not]: 4,
  [Opcode.Jump]: 3,
  [Opcode.JumpIfZero]: 3,
  [Opcode.JumpIfNotZero]: 3,
  [Opcode.Call]: 3,
  [Opcode.Return]: 1,
  [Opcode.Push]: 3,
  [Opcode.Pop]: 2,
  [Opcode.SysCall]: 2,
};

type Byte = number;

export type Offset = {
  type: OffsetType;
  sign: OffsetSign;
  value: Byte;
};

export const emptyOffset = (): Offset => ({
  type: OffsetType.Literal,
  sign: OffsetSign.Plus,
  value: 0,
});

type MemoryAccessInstructionOperands =
  | {
      type: AddressType.Register; // 1
      value: Register; // 1
      // 1 unused
      offset: Offset;
    }
  | {
      type: AddressType.Literal; // 1
      value: number; // 2
      offset: Offset; // 3
    };

// Opcode.Peek,
// AddressType.Register | AddressType.Literal
// RegisterName | addressH
// 0 | addressL
// OffsetType.Literal,
// OffsetSign.Plus,
// offset
const encodeOffset = ({ type, sign, value }: Offset) => [type, sign, value];

export const encodeMemoryAccessInstruction = (
  opcode: Opcode.Peek | Opcode.Poke,
  operands: MemoryAccessInstructionOperands
): Uint8Array => {
  if (operands.type === AddressType.Register) {
    return new Uint8Array([
      opcode,
      AddressType.Register,
      operands.value,
      0,
      ...encodeOffset(operands.offset),
    ]);
  }

  const addressH = (operands.value & 0xff00) >> 8;
  const addressL = operands.value & 0xff;

  return new Uint8Array([
    opcode,
    AddressType.Literal,
    addressH,
    addressL,
    ...encodeOffset(operands.offset),
  ]);
};

export type BranchingInstructionOpcode =
  | Opcode.Call
  | Opcode.Jump
  | Opcode.JumpIfZero
  | Opcode.JumpIfNotZero;

export const encodeBranchingInstruction = (
  opcode: BranchingInstructionOpcode,
  address: number
): Uint8Array => {
  const h = (address & 0xff00) >> 8;
  const l = address & 0xff;
  return new Uint8Array([opcode, h, l]);
};

export type Operand =
  | {
      type: OperandType.Register;
      value: Register;
    }
  | {
      type: OperandType.Literal;
      value: Byte;
    };

export const encodeOperand = (operand: Operand) =>
  new Uint8Array([operand.type, operand.value]);

export type SetInstructionOperands = {
  destination: Register;
  source: Operand;
};

export const encodeSetInstruction = (
  operands: SetInstructionOperands
): Uint8Array => {
  return new Uint8Array([
    Opcode.Set,
    operands.destination,
    ...encodeOperand(operands.source),
  ]);
};

export enum AddressType {
  Literal,
  Register,
}

export enum OffsetType {
  Literal,
  Register,
}

export enum OffsetSign {
  Plus,
  Minus,
}
