import { Node, NodeDefinition, NodeError, Parser } from "../Types";

import { addChildNode } from "../Helpers";

export default class StubParser implements Parser {
  readonly id: string = "stub";
  run(node: Node, _definition: NodeDefinition, errors?: NodeError[]): Node {
    addChildNode(node, {
      errors
    });
    return node;
  }
}
