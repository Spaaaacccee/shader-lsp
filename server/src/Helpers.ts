import {
  CLOSE_BRACE,
  CLOSE_BRACKET,
  DOUBLE_QUOTE,
  ESCAPE,
  MARKER,
  OPEN_BRACE,
  OPEN_BRACKET,
  SINGLE_QUOTE
} from "./Characters";
import { Node, Parser } from "./Types";

import Definitions from "./definitions/Definitions";

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
      if (str[i] === "/" && str[i - 1] !== ESCAPE) {
        mode.regex = false;
      }
      // str[i] = " ";
      continue;
    }

    if (mode.singleQuote) {
      if (str[i] === SINGLE_QUOTE && str[i - 1] !== ESCAPE) {
        mode.singleQuote = false;
      }
      // str[i] = " ";
      continue;
    }

    if (mode.doubleQuote) {
      if (str[i] === DOUBLE_QUOTE && str[i - 1] !== ESCAPE) {
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

    mode.doubleQuote = str[i] === DOUBLE_QUOTE;
    mode.singleQuote = str[i] === SINGLE_QUOTE;

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
  text: string,
  options: {
    singleWord?: boolean;
    startIndex?: number;
    endIndex?: number;
    reverse?: boolean;
  } = {}
): number[] {
  let source = text;
  const matches: number[] = [];
  const mode = {
    singleQuote: false,
    doubleQuote: false
  };
  for (
    let i = options.startIndex || (options.reverse ? text.length - 1 : 0);
    i < (options.endIndex || source.length) && i >= 0;
    options.reverse ? i-- : i++
  ) {
    const character = source[i];
    switch (character) {
      case SINGLE_QUOTE:
        if (mode.singleQuote && source[i - 1] !== ESCAPE) {
          mode.singleQuote = false;
        } else {
          mode.singleQuote = true;
        }
        break;
      case DOUBLE_QUOTE:
        if (mode.doubleQuote && source[i - 1] !== ESCAPE) {
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
    !![
      " ",
      "\n",
      CLOSE_BRACE,
      OPEN_BRACE,
      DOUBLE_QUOTE,
      SINGLE_QUOTE,
      OPEN_BRACKET,
      CLOSE_BRACKET
    ].find(c => c === str)
  );
}

export function getWord(text: string, index: number) {
  function isIdentifier(str :string) {
    return !!str && (/[A-Z]|[a-z]|_|\./g).test(str);
  }
  if (!isIdentifier(text[index])) return "";
  let startIndex = index,
    endIndex = index;
  while (isIdentifier(text[startIndex])) startIndex--;
  while (isIdentifier(text[endIndex])) endIndex++;
  return text.substring(startIndex + 1, endIndex);
}

export function isWhitespace(str: any) {
  return !str || !![" ", "\n"].find(c => c === str);
}

export function splitSafe(source: string): string[] {
  let out = source.split("");
  const indices = searchSafe(" ", source).concat(searchSafe("\n", source));
  return out
    .map((x, i) => (indices.findIndex(j => j === i) === -1 ? x : MARKER))
    .join("")
    .split(MARKER)
    .filter(x => x);
}

export function getLastOfFirstLine(parentNode: Node) {
  return (
    searchSafe("\n", parentNode.content)[0] || parentNode.content.length - 1
  );
}

export function unifyWhitespace(str: string) {
  // Replace CRLF with LF, replace CR with LF, and tab with space.
  return str
    .replace(/\r\n/g, "\n ")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ");
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
    searchSafe(OPEN_BRACE, out, {
      startIndex: 0,
      endIndex: index
    }).length -
    searchSafe(CLOSE_BRACE, out, {
      startIndex: 0,
      endIndex: index
    }).length;
  return depth;
}

export function getNodeByIndex(res: Node, index: number) {
  let node = res;
  while (node.children && node.children.length) {
    let n = node.children.find(
      child =>
        child.sourceMap.endIndex >= index && child.sourceMap.startIndex <= index
    );
    if (n) {
      node = n;
    } else {
      break;
    }
  }
  return node;
}

export function runParsers(node: Node, parser: Parser) {
  if (node.definition.children) {
    for (const childTypeName of node.definition.children()) {
      if (childTypeName.type.parser.id === parser.id) {
        parser.run(node, childTypeName.type);
      }
    }
  }
  return node;
}

export function addChildNode(parentNode: Node, childNode: Partial<Node> = {}) {
  parentNode.children.push({
    children: [],
    content: parentNode.content,
    definition: Definitions.stub,
    errors: [],
    parent: parentNode,
    sourceMap: parentNode.sourceMap,
    ...childNode
  });
}
