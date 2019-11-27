import {
  CategoryDeclarationDefinition,
  CgDeclarationDefinition,
  FogDeclaration,
  MaterialDeclarationDefinition,
  PassDeclarationDefinition,
  SubShaderDeclarationDefinition,
  TagsDeclarationDefinition
} from "./Blocks";

import { NodeDefinition } from '../../Types';
import { PropertyListDeclarationDefinition } from "./PropertyListDeclarationDefinition";
import { ShaderDeclarationDefinition } from "./ShaderDeclarationDefinition";
import { root } from '../../parsers/Parsers';

const RootDefinition: NodeDefinition = {
	children: () => [{ type: ShaderDeclarationDefinition }],
	identifier: "none",
	id: "root",
	parser: root
  };

const Definitions = {
  root: RootDefinition,
  shaderDeclaration: ShaderDeclarationDefinition,
  propertyListDeclaration: PropertyListDeclarationDefinition,
  property: PropertyListDeclarationDefinition,
  subShaderDeclaration: SubShaderDeclarationDefinition,
  passDeclaration: PassDeclarationDefinition,
  tagsDeclaration: TagsDeclarationDefinition,
  materialDeclaration: MaterialDeclarationDefinition,
  fogDeclaration: FogDeclaration,
  categoryDeclaration: CategoryDeclarationDefinition,
  cgDeclaration: CgDeclarationDefinition
};

export default Definitions;
