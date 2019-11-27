import { block, keyword } from "../../parsers/Parsers";
import { code, heading, pre } from '../../format';

import { NodeDefinition } from "../../Types";
import { PropertyListDeclarationDefinition } from './PropertyListDeclarationDefinition';
import { inheritableShaderDeclarations } from './Blocks';

const description = 
`
${pre("Shader")} is the root command of a shader file. Each file must define one (and only one) Shader. 
It specifies how any objects whose material uses this shader are rendered.

${heading("Syntax")}
${code("shaderlab",`Shader "name" { [Properties] __Subshaders__ [Fallback] [CustomEditor] }`)}
Defines a shader. It will appear in the material inspector listed under name. 
Shaders optionally can define a list of properties that show up in material inspector. 
After this comes a list of SubShaders, 
and optionally a fallback and/or a custom editor declaration.

`

export const ShaderDeclarationDefinition: NodeDefinition = {
  identifier: "string",
  id: "shaderDeclaration",
  keyword: "Shader",
  parser: block,
  children: () => [
    { type: PropertyListDeclarationDefinition },
    ...inheritableShaderDeclarations
  ],
  description,
  suggest:["keyword"]
};
