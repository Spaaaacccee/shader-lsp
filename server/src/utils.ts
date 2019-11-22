export function removeComments(str: string | string[]) {
  str = ("__" + str + "__").split("");
  var mode = {
    singleQuote: false,
    doubleQuote: false,
    regex: false,
    blockComment: false,
    lineComment: false,
    condComp: false
  };
  for (var i = 0, l = str.length; i < l; i++) {
    if (mode.regex) {
      if (str[i] === "/" && str[i - 1] !== "\\") {
        mode.regex = false;
      }
      str[i] = " ";
      continue;
    }

    if (mode.singleQuote) {
      if (str[i] === "'" && str[i - 1] !== "\\") {
        mode.singleQuote = false;
      }
      str[i] = " ";
      continue;
    }

    if (mode.doubleQuote) {
      if (str[i] === '"' && str[i - 1] !== "\\") {
        mode.doubleQuote = false;
      }
      str[i] = " ";
      continue;
    }

    if (mode.blockComment) {
      if (str[i] === "*" && str[i + 1] === "/") {
        str[i + 1] = " ";
        mode.blockComment = false;
      }
      str[i] = " ";
      continue;
    }

    if (mode.lineComment) {
      if (str[i + 1] === "\n" || str[i + 1] === "\r") {
        mode.lineComment = false;
      }
      str[i] = " ";
      continue;
    }

    if (mode.condComp) {
      if (str[i - 2] === "@" && str[i - 1] === "*" && str[i] === "/") {
        mode.condComp = false;
      }
      str[i] = " ";
      continue;
    }

    mode.doubleQuote = str[i] === '"';
    mode.singleQuote = str[i] === "'";

    if (str[i] === "/") {
      if (str[i + 1] === "*" && str[i + 2] === "@") {
        mode.condComp = true;
        str[i] = " ";
        continue;
      }
      if (str[i + 1] === "*") {
        str[i] = " ";
        mode.blockComment = true;
        continue;
      }
      if (str[i + 1] === "/") {
        str[i] = " ";
        mode.lineComment = true;
        continue;
      }
      mode.regex = true;
    }
  }
  return str.join("").slice(2, -2);
}

export function getIndicesOf(
  searchStr: string,
  str: string,
  caseSensitive: boolean
) {
  var searchStrLen = searchStr.length;
  if (searchStrLen == 0) {
    return [];
  }
  var startIndex = 0,
    index,
    indices = [];
  if (!caseSensitive) {
    str = str.toLowerCase();
    searchStr = searchStr.toLowerCase();
  }
  while ((index = str.indexOf(searchStr, startIndex)) > -1) {
    indices.push(index);
    startIndex = index + searchStrLen;
  }
  return indices;
}
