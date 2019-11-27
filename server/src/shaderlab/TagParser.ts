import { Node, NodeDefinition, Parser } from '../Types';

export default class TagParser implements Parser {
	readonly id: string = "tag";
	run(node:Node, definition:NodeDefinition) {
		return node;
	}
}