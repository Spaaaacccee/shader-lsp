import {
  CompletionItem,
  CompletionItemKind,
  Connection,
  Diagnostic,
  DiagnosticSeverity,
  MarkupContent,
  Position,
  TextDocument,
  TextDocumentChangeEvent
} from "vscode-languageserver";
import { Node, NodeDefinition, Service } from "../Types";
import { getNodeByIndex, getWord } from "../Helpers";

import Definitions from "./definitions/Definitions";
import Services from "../Services";
import _ from "lodash";
import { code } from "../format";
import { parse } from "../AST";

export function parseDocument(doc: TextDocument): Node {
  const text = doc.getText();
  const res = parse(text, Definitions.root);
  return res;
}
export function provideHover(
  document: TextDocument,
  position: Position
): { contents: MarkupContent } | undefined {
  const doc = parseDocument(document);
  const index = document.offsetAt(position);
  const node = getNodeByIndex(doc, index);
  let content = `${node.definition.keyword || ""} ${node.definition
    .endKeyword || ""}`.trim();
  if (!content) {
    content = node.definition.getWord
      ? node.definition.getWord(doc.content, index)
      : getWord(doc.content, index);
  }
  if (content) {
    return {
      contents: {
        kind: "markdown",
        value: `${code("shaderlab", content, node.identifier)}\n${_.startCase(
          node.definition.id
        )} (${_.startCase(node.definition.parser.id)})`
      }
    };
  } else return undefined;
}

export function provideCompletionResolve(item: CompletionItem): CompletionItem {
  if (item.data) {
    const resolvedItem = _(Definitions)
      .values()
      .find(x => x.id === item.data);
    if (resolvedItem) {
      item.detail = resolvedItem.id;
      item.documentation = {
        kind: "markdown",
        value: resolvedItem.description || ""
      };
    }
  }
  return item;
}

export function provideCompletion(
  doc: TextDocument,
  position: Position
): CompletionItem[] {
  const node = getNodeByIndex(parseDocument(doc), doc.offsetAt(position));
  const suggestions = (_.flatten(
    node.definition
      .children()
      .map(x =>
        (x.type.suggest || [])
          .map(y => ({ suggestion: x.type[y], type: x.type }))
          .filter(z => z.suggestion)
      )
  ) as { suggestion: string; type: NodeDefinition }[]).map(x => ({
    label: x.suggestion,
    kind: CompletionItemKind.Keyword,
    data: x.type.id
  }));

  const snippets: CompletionItem[] = _.flatten(
    (node.definition.snippets || []).map(y => ({
      type: node.definition,
      snippet: y
    }))
  ).map(x => ({
    label: x.snippet.display || x.snippet.value,
    kind: CompletionItemKind.Snippet,
    data: x.type.id,
    insertText: x.snippet.value,
    documentation: {
      kind: "markdown",
      value: `${code("shaderlab", x.snippet.value)}${x.snippet.description ||
        ""}`
    }
  }));
  return [...suggestions, ...snippets];
}

export async function provideDiagnostics(
  change: TextDocumentChangeEvent,
  connection: Connection
): Promise<void> {
  const doc = change.document;
  let diagnostics: Diagnostic[] = [];
  let promises: Promise<Diagnostic[]>[] = [];
  const res = parseDocument(doc);
  function getDiagnostics(node: Node) {
    node.errors.forEach(error => {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: doc.positionAt(error.startIndex),
          end: doc.positionAt(error.endIndex || error.startIndex + 1)
        },
        message: error.description || ""
      });
    });
    (node.definition.services || []).forEach(serviceName => {
    promises.push(
        Services[serviceName].run(
          TextDocument.create(
            change.document.uri,
            "shaderlab",
            1,
            res.content.substr(0,node.sourceMap.contentStartIndex).replace(/./g," ") + node.content
          )
        )
      );
    });
    node.children.forEach(child => {
      getDiagnostics(child);
    });
  }
  getDiagnostics(res);
  const additionalDiagnostics = await Promise.all(promises);

  connection.sendDiagnostics({
    uri: change.document.uri,
    diagnostics: _.flatten(additionalDiagnostics).concat(diagnostics)
  });
}
