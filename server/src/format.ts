export function code(formatter: string, ...strings: (string | undefined)[]) {
  return (
    "```" +
    formatter +
    "\n" +
    strings
      .map(str => (str || "").trim())
      .join(" ")
      .trim() +
    "\n```\n"
  );
}

export function pre(str: string) {
  return `\`${str}\``
}

export function heading(str: string) {
  return `#### ${str}`
}

export function bold(str: string) {
  return `**${str}**`
}

export function link(str:string,url:string) {
  return `[${str}](${url})`
}