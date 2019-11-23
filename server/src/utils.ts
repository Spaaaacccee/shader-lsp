export function format(formatter: string, ...strings: (string | undefined)[]) {
  return (
    "```" +
    formatter +
    "\n" +
    strings
      .map(str => (str || "").trim())
      .join(" ")
      .trim() +
    "\n```"
  );
}

export function camelCaseToNormal(text: string) {
  return (
    text
      // insert a space before all caps
      .replace(/([A-Z])/g, " $1")
      // uppercase the first character
      .replace(/^./, str => str.toUpperCase())
  );
}
