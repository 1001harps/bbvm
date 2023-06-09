import {
  AddressType,
  OffsetSign,
  OffsetType,
  Opcode,
  OperandType,
  Register,
  RegisterName,
} from "./opcode.ts";

const assertNotReached = (_: never) => {};

const MEM_SIZE = 65536;

export class VM {
  rom = new Uint8Array(0);
  memory = new Uint8Array(MEM_SIZE);
  a = 0;
  x = 0;
  y = 0;
  ip = 0;
  sp = MEM_SIZE - 1;
  fp = MEM_SIZE - 1;

  debug = true;

  debugLog(message: string) {
    if (this.debug) {
      console.log("vm:", message);
    }
  }

  push(value: number) {
    this.debugLog(`push: ${value}, sp=$${this.sp}`);
    this.memory[this.sp] = value;
    this.sp--;
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
    switch (r) {
      case Register.A:
        this.a = value;
        return;
      case Register.X:
        this.x = value;
        return;
      case Register.Y:
        this.y = value;
        return;
      case Register.XY:
        this.y = value;
        return;
      case Register.IP:
        this.ip = value;
        return;
      case Register.SP:
        this.sp = value;
        return;
      case Register.FP:
        this.fp = value;
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

  execute(opcode: Opcode) {
    this.debugLog(`* executing ${Opcode[opcode]} *`);

    switch (opcode) {
      case Opcode.Halt:
        this.ip = this.rom.length;
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
      case Opcode.Jump: {
        const address = this.fetch16();
        this.ip = address;
        this.debugLog(`jumping to: ${address}`);
        return;
      }
      case Opcode.JumpIfZero: {
        const value = this.getRegister(Register.A);
        const address = this.fetch16();
        if (value === 0) {
          this.debugLog(`jumping to: ${address}`);
          this.ip = address;
        }
        return;
      }
      case Opcode.JumpIfNotZero: {
        const value = this.getRegister(Register.A);
        const address = this.fetch16();
        if (value !== 0) {
          this.debugLog(`jumping to: ${address}`);
          this.ip = address;
        }
        return;
      }
      case Opcode.Call: {
        const callingAddress = this.fetch16();

        const prevFramePointer = this.getRegister(Register.FP);
        const returnAddress = this.getRegister(Register.IP) + 1;

        const framePointer = this.getRegister(Register.SP);

        this.push(returnAddress & 0xff);
        this.push((returnAddress & 0xff00) >> 8);

        this.push(prevFramePointer & 0xff);
        this.push((prevFramePointer & 0xff00) >> 8);

        this.debugLog(
          `call: $${callingAddress}, return address is $${returnAddress}, fp is $${framePointer}`
        );

        this.setRegister(Register.FP, framePointer);
        this.setRegister(Register.IP, callingAddress);
        return;
      }
      case Opcode.Return: {
        // not really sure why but I have to decrement the stack pointer here for this to work out
        this.pop();

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
      case Opcode.Pop:
        this.setRegister(Register.A, this.pop());
        return;
      default:
        assertNotReached(opcode);
        throw `unknown opcode: ${Opcode[opcode] || opcode}`;
    }
  }

  run(rom: Uint8Array) {
    this.rom = rom;

    while (this.ip < this.rom.length) {
      this.execute(this.fetch());
    }
  }
}
