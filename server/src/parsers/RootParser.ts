import { CLOSE_BRACE, OPEN_BRACE } from "../Characters";
import { Node, NodeDefinition, Parser } from "../Types";
import { addChildNode, searchSafe } from "../Helpers";

export default class RootParser implements Parser {
  readonly id: string = "root";
  run(node: Node, _definition: NodeDefinition) {
    const braceOffset =
      searchSafe(OPEN_BRACE, node.content).length -
      searchSafe(CLOSE_BRACE, node.content).length;
    if (braceOffset !== 0) {
      addChildNode(node, {
        errors: [
          {
            startIndex: node.content.length - 1,
            description: `Mismatched braces.`
          }
        ]
      });
      return node;
    }
    return node;
  }
}
