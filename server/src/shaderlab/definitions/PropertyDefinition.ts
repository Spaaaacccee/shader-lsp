import { NodeDefinition, Snippet } from "../../Types";
import { code, heading, link } from '../../format';

import { unknown } from "../../parsers/Parsers";

const description = 
`
Inside braces multiple properties are defined as follows.

${heading("Numbers and Sliders")}
${code("shaderlab",`name ("display name", Range (min, max)) = number`)}
${code("shaderlab",`name ("display name", Float) = number`)}
${code("shaderlab",`name ("display name", Int) = number`)}
These all defines a number (scalar) property with a default value. The Range form makes it be displayed as a slider between min and max ranges.

${heading(`Colors and Vectors`)}
${code("shaderlab",`name ("display name", Color) = (number,number,number,number)`)}
${code("shaderlab",`name ("display name", Vector) = (number,number,number,number)`)}
Defines a color property with default value of given RGBA components, or a 4D vector property with a default value. 
Color properties have a color picker shown for them, and are adjusted as needed depending on the color space (see ${link("Properties in Shader Programs","https://docs.unity3d.com/Manual/SL-PropertiesInPrograms.html")}). 
Vector properties are displayed as four number fields.

${heading(`Textures`)}
${code("shaderlab",`name ("display name", 2D) = "defaulttexture" {}`)}
${code("shaderlab",`name ("display name", Cube) = "defaulttexture" {}`)}
${code("shaderlab",`name ("display name", 3D) = "defaulttexture" {}`)}
Defines a 2D texture, cubemap or 3D (volume) property respectively.

`

const snippets:Snippet[] = [
  {
	  value: `_IntProperty ("Integer", Int) = 0`,
	  description: "Integer Property",
	  display: `_IntProperty`
  },
  {
    value: `_ColorProperty ("Color", Color) = (0,0,0,0)`,
    description: "Color Property",
    display: "_ColorProperty"
  },
  {
    value: `_TexProperty ("Texture", 2D) = "defaulttexture" {}`,
    description: "Texture Property",
    display: "_TexProperty"
  }
]

export const PropertyDefinition: NodeDefinition = {
  id: "property",
  identifier: "none",
  parser: unknown,
  children: () => [],
  description,
  snippets
};
