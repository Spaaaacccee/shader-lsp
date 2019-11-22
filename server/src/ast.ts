export namespace AST {
  const OPEN_BRACE = "{";
  const CLOSE_BRACE = "}";
  export interface ChildDefinition {
    readonly type: string;
    readonly multiple?: boolean;
  }
  export interface NodeDefinition {
    readonly id: string;
    readonly keyword?: string;
    readonly identifier: "none" | "string" | "identifier";
    readonly children?: ChildDefinition[];
    readonly parser: keyof typeof Parser;
  }
  export interface SourceMap {
    startIndex: number;
    contentStartIndex: number;
    endIndex: number;
    contentEndIndex: number;
  }
  export interface Node {
    sourceMap: SourceMap;
    definition: NodeDefinition;
    identifier?: string;
    children: Node[];
    content: string;
    parent: Node | undefined;
    errors: { startIndex: number; endIndex?: number; description?: string }[];
  }
  export function parse(
    document: string,
    root: NodeDefinition,
    definitions: DefinitionList
  ) {
    const clean = AST.Helpers.removeComments(document);
    const ast = parseRecursive(
      clean,
      {
        definition: root,
        children: [],
        content: clean,
        sourceMap: {
          startIndex: 0,
          endIndex: document.length - 1,
          contentStartIndex: 0,
          contentEndIndex: document.length - 1
        },
        parent: undefined,
        errors: []
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
        const occurences = AST.Helpers.searchSafe(
          definition.keyword,
          parentNode.content
        );
        for (const occurence of occurences) {
          // Make sure the matching keyword is in the current scope.
          const depth =
            AST.Helpers.searchSafe(
              OPEN_BRACE,
              parentNode.content.substring(0, occurence)
            ).length -
            AST.Helpers.searchSafe(
              CLOSE_BRACE,
              parentNode.content.substring(0, occurence)
            ).length;

          if (depth === 0) {
            // Initialise output node
            const node: Node = {
              definition,
              children: [],
              content: parentNode.content,
              identifier: "",
              parent: parentNode,
              sourceMap: {
                startIndex: -1,
                endIndex: -1,
                contentStartIndex: -1,
                contentEndIndex: -1
              },
              errors: []
            };

            const contentStartIndex = AST.Helpers.searchSafe(
              OPEN_BRACE,
              parentNode.content.substr(occurence)
            )[0];

            if (!contentStartIndex) {
              const errorLocation =
                AST.Helpers.searchSafe("\n", parentNode.content)[0] ||
                parentNode.content.length - 1;
              node.errors.push({
                startIndex: errorLocation,
                endIndex: errorLocation + 1,
                description: `Expected '${OPEN_BRACE}'.`
              });
            }
            const endIndex = AST.Helpers.findClosingBrace(
              contentStartIndex,
              parentNode,
              CLOSE_BRACE,
              OPEN_BRACE
            );

            if (endIndex === -1) {
              const errorLocation = AST.Helpers.getLastOfFirstLine(parentNode);
              node.errors.push({
                startIndex: errorLocation,
                endIndex: errorLocation + 1,
                description: `Expected '${CLOSE_BRACE}'.`
              });
            }

            node.sourceMap.startIndex =
              occurence + parentNode.sourceMap.startIndex;

            node.sourceMap.contentStartIndex =
              contentStartIndex + parentNode.sourceMap.startIndex + 1;

            node.sourceMap.endIndex =
              endIndex + parentNode.sourceMap.contentStartIndex;
            node.sourceMap.contentEndIndex =
              endIndex + parentNode.sourceMap.contentStartIndex - 1;

            node.content = parentNode.content.substring(
              node.sourceMap.contentStartIndex,
              node.sourceMap.contentEndIndex
            );

            node.identifier = parentNode.content.substring(
              occurence + definition.keyword.length,
              contentStartIndex - 1
            );

            // Identifier error diagnostics.
            const identifierCount = AST.Helpers.splitSafe(node.identifier)
              .length;
            if (identifierCount > 0 && node.definition.identifier === "none") {
              const errorLocation = AST.Helpers.getLastOfFirstLine(parentNode);
              node.errors.push({
                startIndex: errorLocation,
                endIndex: errorLocation + 1,
                description: `Unexpected identifier ${AST.Helpers.splitSafe(
                  node.identifier
                )}`
              });
            }

            if (
              identifierCount !== 1 &&
              node.definition.identifier !== "none"
            ) {
              const errorLocation = AST.Helpers.getLastOfFirstLine(parentNode);
              node.errors.push({
                startIndex: errorLocation,
                endIndex: errorLocation + 1,
                description: `${node.definition.keyword} requires an identifier.`
              });
            }

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

  export const Definitions = new (class Definitions {
    root = new (class Root implements ASTNodeDefinition {
      readonly children: ASTChildDefinition[] = [
        {
          type: "shaderDeclaration"
        }
      ];
      readonly identifier = "none";
      readonly id = "root";
      readonly keyword?: string;
      readonly parser = "block";
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

export namespace AST.Helpers {
  export function findClosingBrace(
    startIndex: number,
    parentNode: AST.Node,
    CLOSE_BRACE: string,
    OPEN_BRACE: string
  ) {
    let i = startIndex + 1;
    let depth = 1;
    while (depth > 0 && i < parentNode.content.length) {
      if (parentNode.content[i] === CLOSE_BRACE) depth--;
      if (parentNode.content[i] === OPEN_BRACE) depth++;
      i++;
    }
    return depth > 0 ? -1 : i - 1;
  }
  export function removeComments(str: string | string[]) {
    str = ("__" + str + "__").split("");
    var mode = {
      singleQuote: false,
      doubleQuote: false,
      regex: false,
      blockComment: false,
      lineComment: false,
      condComp: false
    };
    for (var i = 0, l = str.length; i < l; i++) {
      if (mode.regex) {
        if (str[i] === "/" && str[i - 1] !== "\\") {
          mode.regex = false;
        }
        // str[i] = " ";
        continue;
      }

      if (mode.singleQuote) {
        if (str[i] === "'" && str[i - 1] !== "\\") {
          mode.singleQuote = false;
        }
        // str[i] = " ";
        continue;
      }

      if (mode.doubleQuote) {
        if (str[i] === '"' && str[i - 1] !== "\\") {
          mode.doubleQuote = false;
        }
        // str[i] = ;
        continue;
      }

      if (mode.blockComment) {
        if (str[i] === "*" && str[i + 1] === "/") {
          str[i + 1] = " ";
          mode.blockComment = false;
        }
        str[i] = " ";
        continue;
      }

      if (mode.lineComment) {
        if (str[i + 1] === "\n" || str[i + 1] === "\r") {
          mode.lineComment = false;
        }
        str[i] = " ";
        continue;
      }

      if (mode.condComp) {
        if (str[i - 2] === "@" && str[i - 1] === "*" && str[i] === "/") {
          mode.condComp = false;
        }
        str[i] = " ";
        continue;
      }

      mode.doubleQuote = str[i] === '"';
      mode.singleQuote = str[i] === "'";

      if (str[i] === "/") {
        if (str[i + 1] === "*" && str[i + 2] === "@") {
          mode.condComp = true;
          str[i] = " ";
          continue;
        }
        if (str[i + 1] === "*") {
          str[i] = " ";
          mode.blockComment = true;
          continue;
        }
        if (str[i + 1] === "/") {
          str[i] = " ";
          mode.lineComment = true;
          continue;
        }
        mode.regex = true;
      }
    }
    return str.join("").slice(2, -2);
  }

  /**
   * Finds all instances of a keyword, skipping the contents of strings.
   * @param str The string to match.
   * @param source The text to search in.
   */
  export function searchSafe(str: string, source: string): number[] {
    const matches: number[] = [];
    const mode = {
      singleQuote: false,
      doubleQuote: false
    };
    for (let i = 0; i < source.length; i++) {
      const character = source[i];
      switch (character) {
        case "'":
          if (mode.singleQuote && source[i - 1] !== "\\") {
            mode.singleQuote = false;
          } else {
            mode.singleQuote = true;
          }
          break;
        case '"':
          if (mode.doubleQuote && source[i - 1] !== "\\") {
            mode.doubleQuote = false;
          } else {
            mode.doubleQuote = true;
          }
          break;
        default:
          if (!mode.doubleQuote && !mode.singleQuote) {
            if (source.substr(i, str.length) === str) {
              matches.push(i);
            }
          }
          break;
      }
    }
    return matches;
  }

  export function splitSafe(source: string): string[] {
    let out = source.split("");
    const indices = searchSafe(" ", source).concat(searchSafe("\n", source));
    return out
      .map((x, i) => (indices.findIndex(j => j === i) === -1 ? x : ""))
      .join("")
      .split("")
      .filter(x => x !== undefined);
  }

  export function getLastOfFirstLine(parentNode: Node) {
    return (
      AST.Helpers.searchSafe("\n", parentNode.content)[0] ||
      parentNode.content.length - 1
    );
  }
}
