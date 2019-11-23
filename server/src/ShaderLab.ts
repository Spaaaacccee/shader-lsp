import { AST } from "./AST";
import {
  Position,
  TextDocument,
  Diagnostic,
  DiagnosticSeverity,
  CompletionItemKind
} from "vscode-languageserver";
import { format, camelCaseToNormal } from "./utils";

export namespace ShaderLab {
  interface ChildDefinition extends AST.ChildDefinition {
    type: keyof typeof Definitions;
  }
  interface NodeDefinition extends AST.NodeDefinition {
    id: keyof typeof Definitions;
    children?: ChildDefinition[];
  }
  export const Definitions = new (class Definitions {
    readonly root: NodeDefinition = {
      children: [{ type: "shaderDeclaration" }],
      identifier: "none",
      id: "root",
      parser: "root"
    };
    readonly shaderDeclaration: NodeDefinition = {
      identifier: "string",
      id: "shaderDeclaration",
      keyword: "Shader",
      parser: "block",
      children: [
        { type: "propertyListDeclaration" },
        { type: "subShaderDeclaration" }
      ]
    };
    readonly propertyListDeclaration: NodeDefinition = {
      id: "propertyListDeclaration",
      keyword: "Properties",
      parser: "block",
      identifier: "none",
      children: [{ type: "property" }]
    };
    readonly property: NodeDefinition = {
      id: "property",
      identifier: "none",
      parser: "text"
    };
    readonly subShaderDeclaration: NodeDefinition = {
      id: "subShaderDeclaration",
      keyword: "SubShader",
      parser: "block",
      identifier: "none",
      children: [{ type: "passDeclaration" }, { type: "tagsDeclaration" }]
    };
    readonly passDeclaration: NodeDefinition = {
      id: "passDeclaration",
      keyword: "Pass",
      parser: "block",
      identifier: "none",
      children: [{ type: "tagsDeclaration" }]
    };
    readonly tagsDeclaration: NodeDefinition = {
      id: "tagsDeclaration",
      identifier: "none",
      keyword: "Tags",
      parser: "block"
    };
    readonly stub: NodeDefinition = {
      id: "stub",
      identifier: "none",
      parser: "text"
    };
  })();
}

export namespace ShaderLab.LSP {
  export function parseDocument(doc: TextDocument): AST.Node {
    const text = doc.getText();
    const res = AST.parse(
      text,
      ShaderLab.Definitions.root,
      (Definitions as unknown) as AST.DefinitionList
    );
    return res;
  }
  export function provideHover(document: TextDocument, position: Position) {
    const node = AST.Helpers.getNodeByIndex(
      parseDocument(document),
      document.offsetAt(position)
    );
    if (node.definition.keyword) {
      return {
        contents: `${format(
          "shaderlab",
          node.definition.keyword,
          node.identifier
        )}\n${camelCaseToNormal(
          node.definition.id
        )} (${camelCaseToNormal(node.definition.parser)})`
      };
    } else return undefined;
  }
  export function provideCompletion(doc: TextDocument, position: Position) {
    const node = AST.Helpers.getNodeByIndex(
      parseDocument(doc),
      doc.offsetAt(position)
    );
    return (node.definition.children || [])
      .filter(
        def =>
          ((Definitions as unknown) as AST.DefinitionList)[def.type].keyword
      )
      .map(def => ({
        label:
          ((Definitions as unknown) as AST.DefinitionList)[def.type].keyword ||
          "",
        kind: CompletionItemKind.Keyword,
        data: 1
      }));
  }
  export function provideDiagnostics(doc: TextDocument): Diagnostic[] {
    let diagnostics: Diagnostic[] = [];
    const res = parseDocument(doc);
    function getErrors(node: AST.Node) {
      node.errors.forEach(error => {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: doc.positionAt(error.startIndex),
            end: doc.positionAt(error.endIndex || error.startIndex + 1)
          },
          message: error.description || ""
        });
      });
      node.children.forEach(child => {
        getErrors(child);
      });
    }
    getErrors(res);
    return diagnostics;
  }
}
