

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
