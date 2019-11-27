import * as _ from "lodash";

import { CLOSE_BRACE, OPEN_BRACE } from "../Characters";
import { Node, NodeDefinition, Parser } from "../Types";
import {
  addChildNode,
  findClosingBrace,
  getDepth,
  searchSafe
} from "../Helpers";

export default class BlockParser implements Parser {
  readonly id: string = "block";
  run(node: Node, definition: NodeDefinition): Node {
    if (definition.keyword) {
      const childStartIndices = searchSafe(definition.keyword, node.content, {
        singleWord: true
      }).filter(index => getDepth(index, node.content) === 0);

      for (const childStartIndex of childStartIndices) {
        const childContentStartIndex = searchSafe(OPEN_BRACE, node.content, {
          startIndex: childStartIndex
        })[0];

        // Syntax error: open brace missing.
        if (childContentStartIndex === undefined) {
          addChildNode(node, {
            errors: [
              {
                startIndex:
                  (searchSafe("\n", node.content, {
                    startIndex: childStartIndex
                  })[0] || node.content.length) +
                  node.sourceMap.contentStartIndex,
                description: `'${OPEN_BRACE}' expected. ${_.startCase(
                  definition.keyword
                )} should be a block.`
              }
            ]
          });
          return node;
        }

        const childContentEndIndex = findClosingBrace(
          childContentStartIndex,
          node.content
        );

        // Syntax error: close brace missing.
        if (childContentEndIndex === undefined) {
          addChildNode(node, {
            errors: [
              {
                startIndex:
                  searchSafe("\n", node.content, {
                    startIndex: childContentStartIndex
                  })[0] || node.content.length,
                description: `'${CLOSE_BRACE}' expected.`
              }
            ]
          });
          return node;
        }

        addChildNode(node, {
          identifier: node.content
            .substring(
              childStartIndex + definition.keyword.length,
              childContentStartIndex
            )
            .trim(),
          content: node.content.substring(
            childContentStartIndex + 1,
            childContentEndIndex
          ),
          definition,
          sourceMap: {
            startIndex: childStartIndex + node.sourceMap.contentStartIndex,
            endIndex:
              childContentEndIndex + node.sourceMap.contentStartIndex + 1,
            contentStartIndex:
              childContentStartIndex + node.sourceMap.contentStartIndex + 1,
            contentEndIndex:
              childContentEndIndex + node.sourceMap.contentStartIndex
          }
        });
      }
    }
    return node;
  }
}
