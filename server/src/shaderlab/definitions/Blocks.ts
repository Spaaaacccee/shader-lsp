import { ChildDefinition, NodeDefinition } from "../../Types";
import { block, keyword, unknown } from "../../parsers/Parsers";

import { TagDefinition } from "./Tags";

export const SubShaderDeclarationDefinition: NodeDefinition = {
  id: "subShaderDeclaration",
  keyword: "SubShader",
  parser: block,
  identifier: "none",
  children: () => [
    { type: PassDeclarationDefinition },
    { type: TagsDeclarationDefinition },
    ...modifierDeclarations
  ],
  suggest: ["keyword"]
};

export const PassDeclarationDefinition: NodeDefinition = {
  id: "passDeclaration",
  keyword: "Pass",
  parser: block,
  identifier: "none",
  children: () => [
    { type: TagsDeclarationDefinition },
    { type: MaterialDeclarationDefinition },
    { type: CgDeclarationDefinition }
  ],
  suggest: ["keyword"]
};

export const CgDeclarationDefinition: NodeDefinition = {
  id: "CgSnippetDeclaration",
  keyword: "CGPROGRAM",
  endKeyword: "ENDCG",
  parser: keyword,
  identifier: "none",
  children: () => [{ type: CgContentDefinition }],
  suggest: ["keyword", "endKeyword"]
};

export const CgContentDefinition: NodeDefinition = {
  id: "CgContent",
  parser: unknown,
  children: () => [],
  identifier: "none"
};

export const TagsDeclarationDefinition: NodeDefinition = {
  id: "tagsDeclaration",
  identifier: "none",
  keyword: "Tags",
  parser: block,
  children: () => [{ type: TagDefinition }],
  suggest: ["keyword"]
};

export const MaterialDeclarationDefinition: NodeDefinition = {
  id: "materialDeclaration",
  identifier: "none",
  keyword: "Material",
  parser: block,
  children: () => [],
  suggest: ["keyword"]
};

export const FogDeclaration: NodeDefinition = {
  id: "fogDeclaration",
  identifier: "none",
  keyword: "Fog",
  parser: block,
  children: () => [],
  suggest: ["keyword"]
};

export const CategoryDeclarationDefinition: NodeDefinition = {
  id: "categoryDeclaration",
  identifier: "none",
  keyword: "Category",
  parser: block,
  children: () => [...inheritableShaderDeclarations, ...modifierDeclarations],
  suggest: ["keyword"]
};

export const modifierDeclarations: ChildDefinition[] = [
  { type: FogDeclaration }
];

export const inheritableShaderDeclarations: ChildDefinition[] = [
  { type: SubShaderDeclarationDefinition },
  { type: CategoryDeclarationDefinition }
];
