import { Assembler, FileResolver } from "./assembler/assembler.ts";
import { getErrorMessage, isParseError } from "./assembler/error.ts";
import { BlueBerry } from "./blueberry.ts";
import { DisassemblyDebugger } from "./debug.ts";

class DenoFileResolver implements FileResolver {
  readFile(filename: string): string {
    return Deno.readTextFileSync(filename);
  }
}

const entryPoint = Deno.args[0];
if (!entryPoint) {
  console.error("filename required");
  Deno.exit();
}

try {
  const a = new Assembler(new DenoFileResolver());
  const program = a.run(entryPoint);

  const d = new DisassemblyDebugger();
  console.log(d.run(program));

  const bb = new BlueBerry();
  bb.start(program);
} catch (error) {
  if (isParseError(error)) {
    console.error(getErrorMessage(error));
    Deno.exit(1);
  }

  throw error;
}
