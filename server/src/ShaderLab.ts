import { AST } from "./AST";
import {
  Position,
  TextDocument,
  Diagnostic,
  DiagnosticSeverity,
  CompletionItemKind} from "vscode-languageserver";
import { format } from "./utils";
export namespace ShaderLab {
  interface ASTChildDefinition extends AST.ChildDefinition {
    type: keyof typeof Definitions;
  }
  interface ASTNodeDefinition extends AST.NodeDefinition {
    id: keyof typeof Definitions;
    children?: ASTChildDefinition[];
  }
  export const Definitions = new (class Definitions {
    root = new (class Root implements ASTNodeDefinition {
      readonly children: ASTChildDefinition[] = [
        {
          type: "shaderDeclaration"
        }
      ];
      readonly identifier = "none";
      readonly id = "root";
      readonly parser = "root";
    })();
    shaderDeclaration = new (class ShaderDeclaration
      implements ASTNodeDefinition {
      readonly identifier = "string";
      readonly id = "shaderDeclaration";
      readonly keyword = "Shader";
      readonly parser = "block";
      readonly children: ASTChildDefinition[] = [
        { type: "propertyListDeclaration" },
        { type: "subShaderDeclaration" }
      ];
    })();
    propertyListDeclaration = new (class PropertyListDeclaration
      implements ASTNodeDefinition {
      children: ASTChildDefinition[] = [{ type: "property" }];
      readonly id = "propertyListDeclaration";
      readonly keyword = "Properties";
      readonly parser = "block";
      readonly identifier = "none";
    })();
    property = new (class Property implements ASTNodeDefinition {
      readonly id = "property";
      readonly children: ASTChildDefinition[] = [];
      readonly parser = "block";
      readonly identifier = "none";
    })();
    subShaderDeclaration = new (class SubShaderDeclaration
      implements ASTNodeDefinition {
      readonly id = "subShaderDeclaration";
      readonly keyword = "SubShader";
      readonly parser = "block";
      readonly identifier = "none";
    })();
  })();
}

export namespace ShaderLab.LSP {
  export function parseDocument(doc: TextDocument): AST.Node {
    const text = doc.getText();
    const res = AST.parse(text, ShaderLab.Definitions.root, Definitions as unknown as AST.DefinitionList);
    return res;
  }
  export function provideHover(
    document: TextDocument,
    position: Position
  ) {
    const node = AST.Helpers.getNodeByIndex(parseDocument(document), document.offsetAt(position));
    return {
      contents: format("shaderlab", node.definition.keyword, node.identifier)
    };
  }
  export function provideCompletion(doc:TextDocument, position: Position) {
    const node = AST.Helpers.getNodeByIndex(parseDocument(doc), doc.offsetAt(position));
    return (node.definition.children || [])
      .filter(def => (Definitions as unknown as AST.DefinitionList)[def.type].keyword)
      .map((def, i) => ({
        label: (Definitions as unknown as AST.DefinitionList)[def.type].keyword || "",
        kind: CompletionItemKind.Keyword,
        data: 1
      }));
  }
  export function provideDiagnostics(doc: TextDocument):Diagnostic[] {
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
