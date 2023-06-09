import { Opcode, instructionWidth } from "./opcode.ts";

export class HackyDisassembler {
  run(program: Uint8Array) {
    let out = "";

    let ip = 0;

    while (ip < program.length) {
      let line = "";

      const opcode: Opcode = program[ip];
      if (!(opcode in Opcode)) throw `unknown opcode:${opcode}, after: ${out}`;

      line += Opcode[opcode];

      ip++;

      const numOperands = instructionWidth[opcode] - 1;
      for (let i = 0; i < numOperands; i++) {
        line += ` ${program[ip]}`;
        ip++;
      }

      out += line + "\n";
    }

    return out;
  }
}
