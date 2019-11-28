import { Diagnostic, TextDocument } from "vscode-languageserver";

import HLSLLintingProvider from "../../hlsl/Linter";
import { Service } from "../../Types";
import _ from "lodash";

function capitalise(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function end(str: string) {
  return [".", "?", ",", "!", ":"].find(x => x === str[str.length - 1])
    ? str
    : `${str}.`;
}

export default class HLSLLinter implements Service {
  diagnostics: Diagnostic[] = [];
  linter = new HLSLLintingProvider();
  async run(text: TextDocument) {
    this.diagnostics = await this.linter.lint(text);
    return this.diagnostics.map(x => ({
      ...x,
      message: end(capitalise(x.message))
    }));
  }
}
