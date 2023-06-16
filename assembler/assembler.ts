import { RegisterName } from "../core/opcode.ts";
import { CodeGenerator } from "./generator.ts";
import { IRGenerator, IRToken } from "./ir.ts";
import { Lexer } from "./lexer.ts";

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

export interface FileResolver {
  readFile(filename: string): string;
}

export class Assembler {
  imports: Record<string, IRToken[]> = {};

  fileResolver: FileResolver;

  constructor(fileResolver: FileResolver) {
    this.fileResolver = fileResolver;
  }

  readFile(filename: string) {
    return this.fileResolver.readFile(filename);
  }

  resolveImports(filename: string) {
    if (this.imports[filename]) return this.imports[filename];

    const source = this.readFile(filename);

    const l = new Lexer();

    const lexTokens = l.run(filename, source);

    const irGenerator = new IRGenerator();
    const irTokens = irGenerator.run(lexTokens);

    this.imports[filename] = irTokens;

    for (const token of irTokens) {
      if (token.type === "import") {
        this.resolveImports(token.filename);
      }
    }
  }

  ir: IRToken[] = [];

  combineIRTokens(filename: string) {
    const tokens = this.imports[filename];
    for (const token of tokens) {
      if (token.type === "import") {
        this.combineIRTokens(token.filename);
        continue;
      }

      this.ir.push(token);
    }
  }

  run(entrypoint: string) {
    this.resolveImports(entrypoint);
    this.combineIRTokens(entrypoint);

    // probably want to do a bit of basic typechecking here before generating,
    // verify operands are correct etc

    const generator = new CodeGenerator();
    const program = generator.run(this.ir);

    return program;
  }
}
