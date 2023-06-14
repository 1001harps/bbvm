import { blue, cyan } from "./debug.ts";
import {
  AddressType,
  OffsetSign,
  OffsetType,
  Opcode,
  OperandType,
  Register,
  RegisterName,
} from "./core/opcode.ts";

const assertNotReached = (_: never) => {};

const MEM_SIZE = 65536;

type VMEventType = "syscall";
type VMEventHandler = (type: number, vm: VM) => void;

export class VM {
  rom = new Uint8Array(0);
  memory = new Uint8Array(MEM_SIZE);
  a = 0;
  x = 0;
  y = 0;
  ip = 0;
  sp = MEM_SIZE;
  fp = MEM_SIZE - 1;

  debug: boolean;

  constructor({ debug }: { debug?: boolean }) {
    this.debug = debug ? true : false;
  }

  debugLog(message: string) {
    if (this.debug) {
      console.log(message);
    }
  }

  push(value: number) {
    this.debugLog(`push: ${value}, sp=$${this.sp}`);
    this.sp--;
    this.memory[this.sp] = value;
  }

  pop(): number {
    const value = this.memory[this.sp];
    this.debugLog(`pop: ${value}, sp=$${this.sp}`);
    this.sp++;
    return value;
  }

  fetch() {
    return this.rom[this.ip++];
  }

  fetch16() {
    const h = this.fetch();
    const l = this.fetch();
    return (h << 8) + l;
  }

  getRegister(r: Register) {
    switch (r) {
      case Register.A:
        return this.a;
      case Register.X:
        return this.x;
      case Register.Y:
        return this.y;
      case Register.XY:
        return (this.x << 8) + this.y;
      case Register.IP:
        return this.ip;
      case Register.SP:
        return this.sp;
      case Register.FP:
        return this.fp;
    }
  }

  setRegister(r: Register, value: number) {
    this.debugLog(`setting ${cyan(Register[r])} to ${cyan(value)}`);

    switch (r) {
      case Register.A:
        this.a = value % 0x100;
        return;
      case Register.X:
        this.x = value % 0x100;
        return;
      case Register.Y:
        this.y = value % 0x100;
        return;
      case Register.XY:
        this.y = value % 0x10000;
        return;
      case Register.IP:
        this.ip = value % 0x10000;
        return;
      case Register.SP:
        this.sp = value % 0x10000;
        return;
      case Register.FP:
        this.fp = value % 0x10000;
        return;
    }
  }

  executeArithmeticLogicInstruction(
    operation: (left: number, right: number) => number
  ) {
    const leftRegister = this.fetch();
    const rightOperandType: OperandType = this.fetch();
    const rightRegisterOrValue = this.fetch();

    const leftValue = this.getRegister(leftRegister);
    const rightValue =
      rightOperandType === OperandType.Register
        ? this.getRegister(rightRegisterOrValue)
        : rightRegisterOrValue;

    this.setRegister(Register.A, operation(leftValue, rightValue));
  }

  call(address: number) {
    const prevFramePointer = this.getRegister(Register.FP);
    const returnAddress = this.getRegister(Register.IP);

    const framePointer = this.getRegister(Register.SP);

    this.push(returnAddress & 0xff);
    this.push((returnAddress & 0xff00) >> 8);

    this.push(prevFramePointer & 0xff);
    this.push((prevFramePointer & 0xff00) >> 8);

    this.push(this.y);
    this.push(this.x);

    this.debugLog(
      `call: $${address}, return address is $${returnAddress}, fp is $${framePointer}`
    );

    this.setRegister(Register.FP, framePointer);
    this.setRegister(Register.IP, address);
  }

  execute(opcode: Opcode) {
    this.debugLog(blue(`* executing ${Opcode[opcode]} *`));

    switch (opcode) {
      case Opcode.Halt:
        this.setRegister(Register.IP, this.rom.length);
        return;
      case Opcode.Set: {
        const destination: Register = this.fetch();
        const operandType: OperandType = this.fetch();

        const valueOrRegister = this.fetch();
        const resolvedValue =
          operandType === OperandType.Literal
            ? valueOrRegister
            : this.getRegister(valueOrRegister);

        this.debugLog(
          `set: ${Register[destination]}=${
            operandType === OperandType.Literal
              ? valueOrRegister
              : Register[valueOrRegister]
          }`
        );

        this.setRegister(destination, resolvedValue);
        return;
      }
      case Opcode.Peek: {
        const addressType: AddressType = this.fetch();

        const operandA = this.fetch();
        const operandB = this.fetch();

        let address = 0;
        if (addressType === AddressType.Literal) {
          address = (operandA << 8) + operandB;
        } else if (addressType === AddressType.Register) {
          address = this.getRegister(operandA);
        } else {
          assertNotReached(addressType);
        }

        const offsetType = this.fetch();
        const offsetSign = this.fetch();
        const offsetOrRegister = this.fetch();

        const offset =
          offsetType === OffsetType.Register
            ? this.getRegister(offsetOrRegister)
            : offsetOrRegister;

        const addressWithOffset =
          offsetSign === OffsetSign.Plus ? address + offset : address - offset;

        const value = this.memory[addressWithOffset];
        this.setRegister(Register.A, value);

        this.debugLog(
          `peek: setting ${RegisterName.a} = ${value}, from $${addressWithOffset}`
        );

        return;
      }
      case Opcode.Poke: {
        const addressType: AddressType = this.fetch();

        const operandA = this.fetch();
        const operandB = this.fetch();

        let address = 0;
        if (addressType === AddressType.Literal) {
          address = (operandA << 8) + operandB;
        } else if (addressType === AddressType.Register) {
          address = this.getRegister(operandA);
        } else {
          assertNotReached(addressType);
        }

        const offsetType = this.fetch();
        const offsetSign = this.fetch();
        const offsetOrRegister = this.fetch();

        const offset =
          offsetType === OffsetType.Register
            ? this.getRegister(offsetOrRegister)
            : offsetOrRegister;

        const addressWithOffset =
          offsetSign === OffsetSign.Plus ? address + offset : address - offset;

        const value = this.getRegister(Register.A);
        this.memory[addressWithOffset] = value;

        this.debugLog(
          `poke: setting $${addressWithOffset} = ${value}, from ${RegisterName.a} `
        );

        return;
      }
      case Opcode.Add: {
        this.executeArithmeticLogicInstruction((left, right) => left + right);
        return;
      }
      case Opcode.Subtract: {
        this.executeArithmeticLogicInstruction((left, right) => left - right);
        return;
      }
      case Opcode.Multiply: {
        this.executeArithmeticLogicInstruction((left, right) => left * right);
        return;
      }
      case Opcode.Divide: {
        this.executeArithmeticLogicInstruction((left, right) => left / right);
        return;
      }
      case Opcode.ShiftLeft: {
        this.executeArithmeticLogicInstruction((left, right) => left << right);
        return;
      }
      case Opcode.ShiftRight: {
        this.executeArithmeticLogicInstruction((left, right) => left >> right);
        return;
      }
      case Opcode.And: {
        this.executeArithmeticLogicInstruction((left, right) => left & right);
        return;
      }
      case Opcode.Or: {
        this.executeArithmeticLogicInstruction((left, right) => left | right);
        return;
      }
      case Opcode.Not: {
        this.executeArithmeticLogicInstruction((left) => ~left);
        return;
      }
      case Opcode.EqualTo: {
        this.executeArithmeticLogicInstruction((left, right) =>
          left === right ? 1 : 0
        );
        return;
      }
      case Opcode.NotEqualTo: {
        this.executeArithmeticLogicInstruction((left, right) =>
          left !== right ? 1 : 0
        );
        return;
      }
      case Opcode.Jump: {
        const address = this.fetch16();
        this.setRegister(Register.IP, address);
        this.debugLog(`jumping to: ${address}`);
        return;
      }
      case Opcode.JumpIfZero: {
        const value = this.getRegister(Register.A);
        const address = this.fetch16();
        if (value === 0) {
          this.debugLog(`jumping to: ${address}`);
          this.setRegister(Register.IP, address);
        }
        return;
      }
      case Opcode.JumpIfNotZero: {
        const value = this.getRegister(Register.A);
        const address = this.fetch16();
        if (value !== 0) {
          this.debugLog(`jumping to: ${address}`);
          this.setRegister(Register.IP, address);
        }
        return;
      }
      case Opcode.Call: {
        const addressToCall = this.fetch16();
        this.call(addressToCall);
        return;
      }
      case Opcode.Return: {
        this.x = this.pop();
        this.y = this.pop();

        const framePointerH = this.pop();
        const framePointerL = this.pop();
        const framePointer = (framePointerH << 8) + framePointerL;

        const returnAddressH = this.pop();
        const returnAddressL = this.pop();
        const returnAddress = (returnAddressH << 8) + returnAddressL;

        this.debugLog(
          `ret: to $${returnAddress}, fp restored to ${framePointer}`
        );

        this.setRegister(Register.IP, returnAddress);
        this.setRegister(Register.FP, framePointer);
        return;
      }
      case Opcode.Push: {
        const operandType: OperandType = this.fetch();
        const valueOrRegister = this.fetch();
        const resolvedValue =
          operandType === OperandType.Literal
            ? valueOrRegister
            : this.getRegister(valueOrRegister);
        this.push(resolvedValue);
        return;
      }
      case Opcode.Pop: {
        const destination: Register = this.fetch();
        this.setRegister(destination, this.pop());
        return;
      }

      case Opcode.SysCall: {
        const code = this.fetch();
        this.listeners["syscall"].forEach((handler) => handler(code, this));
        return;
      }

      default:
        assertNotReached(opcode);
        throw `unknown opcode: ${Opcode[opcode] || opcode}`;
    }
  }

  interrupt() {
    const RENDER_ADDRESS = 3;
    this.call(RENDER_ADDRESS);
  }

  load(rom: Uint8Array) {
    this.rom = rom;
  }

  tick() {
    if (this.ip < this.rom.length) {
      this.execute(this.fetch());
    }
  }

  listeners: Record<VMEventType, VMEventHandler[]> = {
    syscall: [],
  };

  addEventListener(type: VMEventType, handler: VMEventHandler) {
    this.listeners[type].push(handler);
  }

  removeEventListener(type: VMEventType, handler: VMEventHandler) {
    this.listeners[type].filter((x) => x !== handler);
  }

  run() {
    if (!this.rom) return;

    while (this.ip < this.rom.length) {
      this.execute(this.fetch());
    }
  }

  readMem(start: number, end: number) {
    return this.memory.slice(start, end);
  }

  writeMem(position: number, value: number) {
    this.memory[position] = value;
  }
}
