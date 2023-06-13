import { assertEquals } from "https://deno.land/std@0.191.0/testing/asserts.ts";
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
