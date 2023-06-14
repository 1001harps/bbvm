interface MacroDefinition {
  name: string;
  args: string[];
  body: string;
}

export class Preprocessor {
  tokenDefinitions: Record<string, string> = {};
  macroDefinitions: Record<string, MacroDefinition> = {};

  skipWhitespace() {
    while (/\s+/.test(this.source[this.index])) {
      this.index++;
    }
  }

  parseMacro() {
    if (!this.source.startsWith("$macro")) {
      throw `invalid macro: ${this.source}`;
    }

    this.index += "$macro".length;

    this.skipWhitespace();

    // get name
    let name = "";

    while (
      this.index < this.source.length &&
      this.source[this.index] !== "(" &&
      this.source[this.index] !== "\n"
    ) {
      name += this.source[this.index];
      this.index++;
    }

    this.skipWhitespace();

    if (this.source[this.index] !== "(") {
      throw `invalid macro: expected "(", got "${this.source[this.index]}"`;
    }

    this.index++;

    // get args
    const args: string[] = [];
    let arg = "";

    while (
      this.index < this.source.length &&
      this.source[this.index] !== ")" &&
      this.source[this.index] !== "\n"
    ) {
      this.skipWhitespace();

      if (this.source[this.index] === ",") {
        // push prev arg
        if (arg.trim() !== "") {
          args.push(arg);
        }

        // reset current arg name collector
        arg = "";

        this.index++;
        continue;
      }

      arg += this.source[this.index];
      this.index++;
    }

    if (arg.trim() !== "") {
      args.push(arg);
    }

    this.index++;

    this.skipWhitespace();

    if (this.source[this.index] !== "{") {
      throw `invalid macro: expected "{", got "${this.source[this.index]}"`;
    }

    this.index++;

    this.skipWhitespace();

    // get body
    let body = "";

    while (this.index < this.source.length && this.source[this.index] !== "}") {
      body += this.source[this.index];
      this.index++;
    }

    // skip "}"
    this.index++;

    this.macroDefinitions[name] = {
      name,
      args,
      body,
    };
  }

  getTokenDefinitions(source: string) {
    let sourceWithoutDefinitions = "";

    const lines = source.split("\n");

    // get definitions
    for (const line of lines) {
      if (line.startsWith("$define")) {
        const [_, name, value] = line.trim().split(/\s+/);
        this.tokenDefinitions[name] = value;
      } else {
        sourceWithoutDefinitions += line + "\n";
      }
    }

    return sourceWithoutDefinitions;
  }

  source = "";
  index = 0;

  macroDefinitionKeyword = "$macro";

  getMacroDefinitions() {
    let sourceWithoutDefinitions = "";

    while (this.index < this.source.length) {
      if (
        this.source[this.index] === "$" &&
        this.source.substring(
          this.index,
          this.macroDefinitionKeyword.length
        ) === this.macroDefinitionKeyword
      ) {
        this.parseMacro();
        this.index++;
        continue;
      }

      sourceWithoutDefinitions += this.source[this.index];
      this.index++;
    }

    return sourceWithoutDefinitions;
  }

  run(source: string): string {
    this.source = source;

    let processedSource = this.source;

    //  processedSource = this.getMacroDefinitions();
    // processedSource = this.getTokenDefinitions(processedSource);

    // apply defines
    for (const [name, value] of Object.entries(this.tokenDefinitions)) {
      processedSource = processedSource.replaceAll(`$${name}`, value);
    }

    return processedSource;
  }
}
