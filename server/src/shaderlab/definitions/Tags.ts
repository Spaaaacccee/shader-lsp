import { root, unknown } from '../../parsers/Parsers';

import { NodeDefinition } from '../../Types';
import { ShaderDeclarationDefinition } from "./ShaderDeclarationDefinition";

export const TagDefinition: NodeDefinition = {
	children: () => [],
	identifier: "none",
	id: "tag",
	parser: unknown
};