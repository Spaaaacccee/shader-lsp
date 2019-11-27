type NonStringKeys<T> = {
  [P in keyof T]: T[P] extends string | undefined ? never : P;
}[keyof T];

type PickString<T> = Pick<T, Exclude<keyof T, NonStringKeys<T>>>;

export interface Parser {
  run(node: Node, definition: NodeDefinition, errors?: NodeError[]): Node;
  readonly id: string;
}

export interface ChildDefinition {
  readonly type: NodeDefinition;
  readonly multiple?: boolean;
}

interface NodeDefinitionBase {
  readonly id: string;
  readonly keyword?: string;
  readonly endKeyword?: string;
  readonly values?: string[];
  readonly identifier: "none" | "string" | "identifier";
  readonly children: () => ChildDefinition[];
  readonly getWord?: (content: string, index: number) => string;
  readonly parser: Parser;
  readonly description?: string;
}
export type Snippet = {
  value: string;
  display?: string;
  description?: string;
};

export interface NodeDefinition extends NodeDefinitionBase {
  readonly suggest?: (keyof PickString<NodeDefinitionBase>)[];
  readonly snippets?: Snippet[];
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

export interface DefinitionList {
  [key: string]: NodeDefinition | undefined;
}
