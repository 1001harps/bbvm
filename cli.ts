import { Assembler } from "./assembler.ts";
import { BlueBerry, bbHeader } from "./blueberry.ts";
import { Preprocessor } from "./preprocessor.ts";

const entryPoint = Deno.args[0];
if (!entryPoint) {
  console.error("filename required");
  Deno.exit();
}

const source = Deno.readTextFileSync(entryPoint);

const sourceWithHeader = `
${bbHeader}
${source}
`;

const p = new Preprocessor();
const processedSource = p.run(sourceWithHeader);

const a = new Assembler();
const program = a.run(processedSource);

const bb = new BlueBerry();
bb.start(program);
