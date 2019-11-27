import { bold, code, heading, link, pre } from "../../format";

import { NodeDefinition } from "../../Types";
import { PropertyDefinition } from "./PropertyDefinition";
import { block } from "../../parsers/Parsers";
import { inheritableShaderDeclarations } from "./Blocks";

const description = `
Shaders can define a list of parameters to be set by artists in Unity’s ${link(
  "material inspector",
  "https://docs.unity3d.com/Manual/Materials.html"
)}. 
The ${pre(`Properties`)} block in the ${link(
  "shader file",
  "https://docs.unity3d.com/Manual/SL-Shader.html"
)} defines them.

${heading("Syntax")}
${code("shaderlab", "Properties { Property [Property ...] }")}
Defines the property block.
`;

export const PropertyListDeclarationDefinition: NodeDefinition = {
  id: "propertyListDeclaration",
  keyword: "Properties",
  parser: block,
  identifier: "none",
  children: () => [
    { type: PropertyDefinition },
    ...inheritableShaderDeclarations
  ],
  description,
  suggest:["keyword"],
};
