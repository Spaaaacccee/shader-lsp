import { NodeDefinition, DefinitionList, Node } from "./Types";

import { unifyWhitespace, removeComments, runParsers } from "./Helpers";

import Definitions from "./definitions/Definitions";

export function parse(document: string, root: NodeDefinition) {
  const clean = unifyWhitespace(removeComments(document));
  const ast = parseRecursive(
    root.parser.run(
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
      Definitions.stub
    )
  );
  return ast;
}

export function parseRecursive(parentNode: Node): Node {
  let node = { ...parentNode };
  if (parentNode.errors.length) return node;
  if (node.definition.children) {
    const parsers = [
      ...new Set(node.definition.children().map(x => x.type.parser))
    ];
    for (const parser of parsers) {
      node = runParsers(node, parser);
      if (parentNode.errors.length) return node;
    }
    node.children = node.children.map(child => parseRecursive(child));
  }
  return node;
}
