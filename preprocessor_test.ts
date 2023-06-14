import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.191.0/testing/asserts.ts";
import { Preprocessor } from "./preprocessor.ts";

Deno.test("preprocessor replaces define token", () => {
  const source = "$define TOKEN 123\ncall $TOKEN";

  const expected = "call 123";

  const p = new Preprocessor();
  const result = p.run(source.trim());

  assertEquals(result.trim(), expected.trim());
});

Deno.test("preprocessor replaces multiple tokens", () => {
  const source = `
$define TOKEN 123
call $TOKEN
set a=$TOKEN
peek xy[$TOKEN]
`;

  const expected = `
call 123
set a=123
peek xy[123]
`;

  const p = new Preprocessor();
  const result = p.run(source.trim());

  assertEquals(result.trim(), expected.trim());
});

Deno.test("preprocessor replaces multiple define tokens", () => {
  const source = "$define TOKEN 123\ncall $TOKEN";

  const expected = "call 123";

  const p = new Preprocessor();
  const result = p.run(source.trim());

  assertEquals(result.trim(), expected.trim());
});

// Deno.test("preprocessor - correctly parses macro definition", () => {
//   const body = `
//   $arg1
//   $arg2

//   // generated
//   jump==0 end
//   // /generated

//   $body

//   // generated
//   end:
//   // /generated
//   `.trim();

//   const source = `
// $macro test($arg1,$arg2) {
//   ${body}
// }`;

//   const p = new Preprocessor();
//   const result = p.run(source.trim());

//   // definition is removed from source
//   assertEquals(result.trim(), "");

//   const def = p.macroDefinitions["test"];
//   assertExists(def);
//   assertEquals(def.name, "test");
//   assertEquals(def.args.length, 2);
//   assertEquals(def.args[0], "$arg1");
//   assertEquals(def.args[1], "$arg2");
//   assertEquals(def.body.trim(), body.trim());
// });

// Deno.test("preprocessor - applies macro", () => {
//   const source = `
// $macro if($condition) {
//   $condition

//   // generated
//   jump==0 end_$ID0
//   // /generated

//   $body

//   // generated
//   end_$ID0:
//   // /generated
// }

// $if(== a 1) {
//   set a=111
// }
// `;

//   const p = new Preprocessor();
//   const result = p.run(source.trim());

//   // definition is removed from source
//   assertEquals(result.trim(), "");
// });
