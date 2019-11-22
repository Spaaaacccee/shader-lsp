import { removeComments, getIndicesOf } from "./utils";
export namespace AST {
  export interface ChildDefinition {
    readonly type: string;
    readonly multiple?: boolean;
  }
  export interface NodeDefinition {
    readonly id: string;
    readonly keyword?: string;

    readonly children?: ChildDefinition[];
    readonly parser: keyof typeof Parser;
  }
  export interface SourceInformation {
    startIndex: number;
    endIndex: number;
  }
  export interface Node {
    source: SourceInformation;
    definition: NodeDefinition;
    identifier?: string;
    children: Node[];
    content: string;
  }
  export function parse(
    document: string,
    root: NodeDefinition,
    definitions: DefinitionList
  ) {
    const clean = removeComments(document);
    const ast = parseRecursive(
      clean,
      {
        definition: root,
        children: [],
        content: clean,
        source: { startIndex: 0, endIndex: document.length }
      },
      definitions,
      document
    );
    return ast;
  }
  export type DefinitionList = {
    [key: string]: AST.NodeDefinition;
  };

  export function parseRecursive(
    str: string,
    node: AST.Node,
    definitions: DefinitionList,
    document: string
  ) {
    // For each child type try to find all of the matching children by using a specific parser.
    for (const childType of node.definition.children || []) {
      const childDefinition = definitions[childType.type];
      const children = Parser[childDefinition.parser](node, childDefinition);
      // For each child node found create its children.
      for (const child of children) {
        const result = parseRecursive(
          child.content,
          child,
          definitions,
          document
        );
        node.children.push(result);
      }
    }
    return node;
  }
  export const Parser = new (class Parser {
    block(parentNode: Node, definition: NodeDefinition): Node[] {
      const nodes: Node[] = [];
      if (definition.keyword) {
        const occurences = getIndicesOf(
          definition.keyword,
          parentNode.content,
          true
        );
        for (const occurence of occurences) {
          const node: Node = {
            definition,
            children: [],
            content: parentNode.content,
            identifier: "",
            source: {
              startIndex: occurence + parentNode.source.startIndex,
              endIndex: parentNode.source.endIndex
            }
          };
          const depth =
            getIndicesOf("{", parentNode.content.substring(0, occurence), true)
              .length -
            getIndicesOf("}", parentNode.content.substring(0, occurence), true)
              .length;
          if (depth === 0) {
            const iStart = parentNode.content.search("{");
            const iEnd = (() => {
              let i = occurence;
              let depth = 1;
              while (depth > 0 && i < parentNode.content.length) {
                if (parentNode.content[i] === "}") depth--;
                if (parentNode.content[i] === "{") depth++;
                i++;
              }
              return i;
            })();
            node.source.endIndex = iEnd + parentNode.source.endIndex;
            const trimmed = parentNode.content.substring(iStart, iEnd).trim();
            node.content = trimmed.substring(1, trimmed.length - 1).trim();
            node.identifier = parentNode.content
              .substring(occurence + definition.keyword.length, iStart - 1)
              .trim();
            nodes.push(node);
          }
        }
      }
      return nodes;
    }
  })();
}

export namespace ShaderLab {
  interface ASTChildDefinition extends AST.ChildDefinition {
    type: keyof typeof Definitions;
  }
  interface ASTNodeDefinition extends AST.NodeDefinition {
    id: keyof typeof Definitions;
    children?: ASTChildDefinition[];
  }
  const Root = new (class Root implements ASTNodeDefinition {
    readonly children: ASTChildDefinition[] = [
      {
        type: "shaderDeclaration"
      }
    ];
    readonly id = "root";
    readonly keyword?: string;
    readonly parser = "block";
  })();
  const ShaderDeclaration = new (class ShaderDeclaration
    implements ASTNodeDefinition {
    readonly id = "shaderDeclaration";
    readonly keyword = "Shader";
    readonly parser = "block";
    readonly children: ASTChildDefinition[] = [
      { type: "propertyListDeclaration" }
    ];
  })();
  const PropertyListDeclaration = new (class PropertyListDeclaration
    implements ASTNodeDefinition {
    children: ASTChildDefinition[] = [];
    readonly id = "propertyListDeclaration";
    readonly keyword = "Properties";
    readonly parser = "block";
  })();
  const Property = new (class Property implements ASTNodeDefinition {
    readonly id = "property";
    readonly children: ASTChildDefinition[] = [];
    readonly parser = "block";
  })();
  const SubShaderDeclaration = new (class SubShaderDeclaration
    implements ASTNodeDefinition {
    readonly id = "subShaderDeclaration";
    readonly keyword = "SubShader";
    readonly parser = "block";
  })();
  export const Definitions = new (class Definitions {
    root = Root;
    shaderDeclaration = ShaderDeclaration;
    propertyListDeclaration = PropertyListDeclaration;
    property = Property;
    subShaderDeclaration = SubShaderDeclaration;
  })();
}
