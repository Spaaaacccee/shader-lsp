import { Node, NodeDefinition, Parser } from '../Types';

export default class UnknownParser implements Parser {
	readonly id = "unknown";
	/**
	 * A parser that should only be run once on a node. Converts all of the content into a single node of text.
	 * If this parser is run twice on a node (if two children of a node require the text parser), two overlapping nodes will be created.
	 * @param node
	 * @param definitions
	 */
	run(node: Node, definition: NodeDefinition): Node {
	  node.children.push({
		definition,
		children: [],
		content: node.content,
		errors: [],
		parent: node,
		sourceMap: {
		  startIndex: node.sourceMap.contentStartIndex,
		  endIndex: node.sourceMap.contentEndIndex,
		  contentEndIndex: node.sourceMap.contentEndIndex,
		  contentStartIndex: node.sourceMap.contentStartIndex
		}
	  });
	  return node;
	}
  }