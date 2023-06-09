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
  [Opcode.And]: 4,
  [Opcode.Or]: 4,
  [Opcode.Not]: 4,
  [Opcode.Jump]: 3,
  [Opcode.JumpIfZero]: 3,
  [Opcode.JumpIfNotZero]: 3,
  [Opcode.Call]: 3,
  [Opcode.Return]: 1,
  [Opcode.Push]: 3,
  [Opcode.Pop]: 1,
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
