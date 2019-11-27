import { Node, NodeDefinition, Parser } from "../Types";
import { getDepth, searchSafe } from "../Helpers";

export default class KeywordParser implements Parser {
  readonly id: string = "keyword";
  run(node: Node, definition: NodeDefinition): Node {
    if (definition.keyword && definition.endKeyword) {
      const childStartIndices = searchSafe(definition.keyword, node.content, {
        singleWord: true
      }).filter(index => getDepth(index, node.content) === 0);
      const childEndIndicies = searchSafe(definition.endKeyword, node.content, {
        singleWord: true
      }).filter(index => getDepth(index, node.content) === 0);
      for (let i = 0; i < childStartIndices.length; i++) {
        const startIndex = childStartIndices[i];
        const endIndex = childEndIndicies[i];

        // Syntax error: mismatched keywords.
        if (endIndex <= startIndex) {
          return node;
        }

        node.children.push({
          children: [],
          content: node.content.substring(
            startIndex + definition.keyword.length,
            endIndex
          ),
          definition,
          errors: [],
          parent: node,
          sourceMap: {
            contentEndIndex: endIndex + node.sourceMap.contentStartIndex,
            contentStartIndex:
              startIndex + 1 + node.sourceMap.contentStartIndex,
            endIndex:
              endIndex +
              definition.endKeyword.length +
              1 +
              node.sourceMap.contentStartIndex,
            startIndex: startIndex + node.sourceMap.contentStartIndex
          }
        });
      }
    }
    return node;
  }
}
