import { Assembler, IRGenerator } from "./assembler.ts";
import { Lexer } from "./assembler/lexer.ts";
import { BlueBerry, bbHeader } from "./blueberry.ts";
import { Preprocessor } from "./preprocessor.ts";

const entryPoint = Deno.args[0];
if (!entryPoint) {
  console.error("filename required");
  Deno.exit();
}

const source = Deno.readTextFileSync(entryPoint);

const sourceWithHeader = `
${source}
`;

const l = new Lexer();
const tokens = l.run(entryPoint, sourceWithHeader);
// console.log(tokens);

const irg = new IRGenerator();
const ir = irg.run(tokens);

console.log(ir);

throw 123;

// const p = new Preprocessor();
// const processedSource = p.run(sourceWithHeader);

// const a = new Assembler();
// const program = a.run(processedSource);

// const bb = new BlueBerry();
// bb.start(program);
