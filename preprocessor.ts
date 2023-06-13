export class Preprocessor {
  run(source: string): string {
    const definitions: Record<string, string> = {};

    let sourceWithoutDefinitions = "";

    const lines = source.split("\n");

    // get definitions
    for (const line of lines) {
      if (line.startsWith("$define")) {
        const [_, name, value] = line.trim().split(/\s+/);
        definitions[name] = value;
      } else {
        sourceWithoutDefinitions += line + "\n";
      }
    }

    // apply definitions
    for (const [name, value] of Object.entries(definitions)) {
      sourceWithoutDefinitions = sourceWithoutDefinitions.replaceAll(
        `$${name}`,
        value
      );
    }

    return sourceWithoutDefinitions;
  }
}
