// deno-lint-ignore-file no-explicit-any

export const blue = (m: any) => "\x1b[34m" + m + "\x1b[0m";
export const green = (m: any) => "\x1b[34m" + m + "\x1b[0m";
export const cyan = (m: any) => "\x1b[36m" + m + "\x1b[0m";

import { Opcode, instructionWidth } from "./opcode.ts";

export class DisassemblyDebugger {
  branchOpcodes = [
    Opcode.Call,
    Opcode.Jump,
    Opcode.JumpIfZero,
    Opcode.JumpIfNotZero,
  ];
  branchAddresses = new Set<number>();

  getBranchAddresses(program: Uint8Array) {
    let ip = 0;

    while (ip < program.length) {
      const opcode: Opcode = program[ip];
      if (!(opcode in Opcode)) throw `unknown opcode:${opcode}`;

      if (this.branchOpcodes.includes(opcode)) {
        const address = (program[ip + 1] << 8) + program[ip + 2];
        this.branchAddresses.add(address);
      }

      if (opcode === 0 || opcode) ip++;

      const numOperands = instructionWidth[opcode] - 1;
      for (let i = 0; i < numOperands; i++) {
        ip++;
      }
    }
  }

  run(program: Uint8Array) {
    const resetColour = "\x1b[0m";
    const formatBranchAddress = (s: string) => "\x1b[32m" + s + resetColour;
    const formatOpcode = (s: string) => "\x1b[34m" + s + resetColour;

    this.getBranchAddresses(program);

    let out = "";

    let ip = 0;

    while (ip < program.length) {
      let line = "";

      const opcode: Opcode = program[ip];
      if (!(opcode in Opcode)) throw `unknown opcode:${opcode}, after: ${out}`;

      if (this.branchAddresses.has(ip)) {
        line += formatBranchAddress(`$${ip.toString().padStart(4, "0")} `);
      } else {
        line += `$${ip.toString().padStart(4, "0")} `;
      }

      line += formatOpcode(Opcode[opcode]);

      ip++;

      if (this.branchOpcodes.includes(opcode)) {
        const address = (program[ip] << 8) + program[ip + 1];
        line += formatBranchAddress(` $${address.toString().padStart(4, "0")}`);
        ip += 2;
      } else {
        const numOperands = instructionWidth[opcode] - 1;
        for (let i = 0; i < numOperands; i++) {
          line += ` ${program[ip]}`;
          ip++;
        }
      }

      out += line + "\n";
    }

    return out;
  }
}
