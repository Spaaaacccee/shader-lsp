import { camelCaseToNormal } from './utils';

export namespace AST {
  export const OPEN_BRACE = "{";
  export const CLOSE_BRACE = "}";
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
    /**
     * The index of the first character in this node.
     */
    startIndex: number;
    /**
     * The index of the gap after the opening brace, or the gap after the first character of this node if the node does not use braces.
     */
    contentStartIndex: number;
    /**
     * The index of the last character in this node.
     */
    endIndex: number;
    /**
     * The index of the gap before the closing brace, or the gap before the last character of this node if the node does not use braces.
     */
    contentEndIndex: number;
  }
  export interface NodeError {
    startIndex: number;
    endIndex?: number;
    description?: string;
  }

  export interface Node {
    sourceMap: SourceMap;
    definition: NodeDefinition;
    identifier?: string;
    children: Node[];
    content: string;
    parent: Node | undefined;
    errors: NodeError[];
  }
  export function parse(
    document: string,
    root: NodeDefinition,
    definitions: DefinitionList
  ) {
    const clean = AST.Helpers.unifyWhitespace(
      AST.Helpers.removeComments(document)
    );
    const ast = parseRecursive(
      Parser[root.parser](
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
        definitions
      ),
      definitions
    );
    return ast;
  }
  export type DefinitionList = {
    [key: string]: AST.NodeDefinition;
  };

  export function parseRecursive(node: AST.Node, definitions: DefinitionList) {
    let saturated = { ...node };
    if (node.errors.length) return saturated;
    const requiredParsers = [
      ...new Set(
        (node.definition.children || []).map(x => definitions[x.type].parser)
      )
    ];
    for (const parser of requiredParsers) {
      saturated = Parser[parser](saturated, definitions);
      if (node.errors.length) return saturated;
    }
    saturated.children = saturated.children.map(child =>
      parseRecursive(child, definitions)
    );
    return saturated;
  }
  export const Parser = new (class Parser {
    block(parentNode: Node, definitions: DefinitionList): Node {
      let node: Node = {
        ...parentNode
      };
      for (const childTypeName of parentNode.definition.children || []) {
        const childDefinition = definitions[childTypeName.type];
        if (childDefinition.keyword) {
          const childStartIndices = AST.Helpers.searchSafe(
            childDefinition.keyword,
            node.content,
            { singleWord: true }
          ).filter(index => AST.Helpers.getDepth(index, node.content) === 0);
          for (const childStartIndex of childStartIndices) {
            const childContentStartIndex = AST.Helpers.searchSafe(
              OPEN_BRACE,
              node.content,
              { startIndex: childStartIndex }
            )[0];
            if (childContentStartIndex === undefined) {
              node.children.push(
                createStubNode(definitions, node, [
                  {
                    startIndex:
                      (AST.Helpers.searchSafe("\n", node.content, {
                        startIndex: childStartIndex
                      })[0] || node.content.length) +
                      parentNode.sourceMap.contentStartIndex,
                    description: `'${OPEN_BRACE}' expected. A ${camelCaseToNormal(childDefinition.keyword)} should be a block.`
                  }
                ])
              );
              return node;
            }

            const childContentEndIndex = AST.Helpers.findClosingBrace(
              childContentStartIndex,
              node.content
            );

            if (childContentEndIndex === undefined) {
              node.children.push(
                createStubNode(definitions, node, [
                  {
                    startIndex:
                      AST.Helpers.searchSafe("\n", node.content, {
                        startIndex: childContentStartIndex
                      })[0] || node.content.length,
                    description: `'${CLOSE_BRACE}' expected.`
                  }
                ])
              );
              return node;
            }

            node.children.push({
              identifier: node.content
                .substring(
                  childStartIndex + childDefinition.keyword.length,
                  childContentStartIndex
                )
                .trim(),
              children: [],
              content: node.content.substring(
                childContentStartIndex + 1,
                childContentEndIndex
              ),
              definition: childDefinition,
              errors: [],
              parent: node,
              sourceMap: {
                startIndex:
                  childStartIndex + parentNode.sourceMap.contentStartIndex,
                endIndex:
                  childContentEndIndex +
                  parentNode.sourceMap.contentStartIndex +
                  1,
                contentStartIndex:
                  childContentStartIndex +
                  parentNode.sourceMap.contentStartIndex +
                  1,
                contentEndIndex:
                  childContentEndIndex + parentNode.sourceMap.contentStartIndex
              }
            });
          }
        }
      }
      return node;
    }
    root(parentNode: Node, definitions: DefinitionList): Node {
      let node = { ...parentNode };
      const braceOffset =
        AST.Helpers.searchSafe(OPEN_BRACE, parentNode.content).length -
        AST.Helpers.searchSafe(CLOSE_BRACE, parentNode.content).length;
      if (braceOffset !== 0) {
        node.children.push(
          createStubNode(definitions, node, [
            {
              startIndex: node.content.length - 1,
              description: `Mismatched braces.`
            }
          ])
        );
        return node;
      }
      return node;
    }
    text(parentNode: Node): Node {
      return parentNode;
    }
  })();

  function createStubNode(
    definitions: DefinitionList,
    node: Node,
    errors: NodeError[] = []
  ): Node {
    return {
      children: [],
      content: "",
      definition: definitions["stub"],
      errors,
      parent: node,
      sourceMap: node.sourceMap
    };
  }
}

export namespace AST.Helpers {
  export function findClosingBrace(startIndex: number, text: string) {
    let i = startIndex + 1;
    let depth = 1;
    while (depth > 0 && i < text.length) {
      if (text[i] === CLOSE_BRACE) depth--;
      if (text[i] === OPEN_BRACE) depth++;
      i++;
    }
    return depth > 0 ? undefined : i - 1;
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
  export function searchSafe(
    str: string,
    source: string,
    options: {
      singleWord?: boolean;
      startIndex?: number;
      endIndex?: number;
    } = {}
  ): number[] {
    const matches: number[] = [];
    const mode = {
      singleQuote: false,
      doubleQuote: false
    };
    for (
      let i = options.startIndex || 0;
      i < (options.endIndex || source.length);
      i++
    ) {
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
              if (options.singleWord) {
                if (
                  !isIdentifier(source[i - 1]) &&
                  !isIdentifier(source[i + str.length])
                ) {
                  matches.push(i);
                }
              } else {
                matches.push(i);
              }
            }
          }
          break;
      }
    }
    return matches;
  }

  export function isIdentifier(str: any) {
    return !(
      !str ||
      !![" ", "\n", AST.CLOSE_BRACE, AST.OPEN_BRACE, '"', "'"].find(
        c => c === str
      )
    );
  }

  export function isWhitespace(str: any) {
    return !str || !![" ", "\n"].find(c => c === str);
  }

  export function splitSafe(source: string): string[] {
    let out = source.split("");
    const indices = searchSafe(" ", source).concat(searchSafe("\n", source));
    return out
      .map((x, i) => (indices.findIndex(j => j === i) === -1 ? x : ""))
      .join("")
      .split("")
      .filter(x => x);
  }

  export function getLastOfFirstLine(parentNode: Node) {
    return (
      AST.Helpers.searchSafe("\n", parentNode.content)[0] ||
      parentNode.content.length - 1
    );
  }
  export function unifyWhitespace(str: string) {
    return str.replace("\r\n", "\n ").replace(/\s/g, " ");
  }
  export function getDepth(
    index: number,
    text: string,
    options: { removeOuterBraces?: boolean } = {}
  ) {
    let out = text;
    if (options.removeOuterBraces) {
      let str = out.split("");
      for (let i = 0, j = str.length - 1; i < Math.floor(str.length / 2); i++) {
        if (isWhitespace(str[i])) {
          continue;
        }
        while (j > i) {
          if (isWhitespace(str[j])) {
            j--;
          } else {
            break;
          }
        }
        if (str[i] === OPEN_BRACE && str[j] === CLOSE_BRACE) {
          str[i] === " ", str[j] === " ";
        } else {
          break;
        }
      }
      out = str.join("");
    }
    let depth =
      searchSafe(OPEN_BRACE, out, { startIndex: 0, endIndex: index }).length -
      searchSafe(CLOSE_BRACE, out, { startIndex: 0, endIndex: index }).length;
    return depth;
  }
  export function getNodeByIndex(res: AST.Node, index: number) {
    let node = res;
    while (node.children && node.children.length) {
      let n = node.children.find(
        child =>
          child.sourceMap.endIndex >= index &&
          child.sourceMap.startIndex <= index
      );
      if (n) {
        node = n;
      } else {
        break;
      }
    }
    return node;
  }
}
