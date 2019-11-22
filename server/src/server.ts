import {
  createConnection,
  TextDocuments,
  TextDocument,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  Range
} from "vscode-languageserver";

import { AST, ShaderLab } from "./ast";
import { format } from "./utils";

const definitions = (ShaderLab.Definitions as unknown) as AST.DefinitionList;


let connection = createConnection(ProposedFeatures.all);

let documents: TextDocuments = new TextDocuments();

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
  let capabilities = params.capabilities;
  // Does the client support the `workspace/configuration` request?
  // If not, we will fall back using global settings
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  return {
    capabilities: {
      textDocumentSync: documents.syncKind,
      // Tell the client that the server supports code completion
      completionProvider: {
        resolveProvider: true
      },
      hoverProvider: true
    }
  };
});

connection.onInitialized(() => {
  console.log("initialized");
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined
    );
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders(_event => {
      connection.console.log("Workspace folder change event received.");
    });
  }
});

// The example settings
interface ExampleSettings {
  maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    globalSettings = <ExampleSettings>(
      (change.settings.languageServerExample || defaultSettings)
    );
  }

  // Revalidate all open text documents
  // documents.all().forEach(()=>{

  // });
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: "languageServerExample"
    });
    documentSettings.set(resource, result);
  }
  return result;
}

connection.onHover(e => {
  const doc = documents.get(e.textDocument.uri);
  if (doc) {
    const text = doc.getText();
    const nodes = parseDocument(doc);
    const node = getNodeByIndex(nodes, doc.offsetAt(e.position));
    return {
      contents: format("shaderlab", node.definition.keyword, node.identifier)
    };
  }

  return undefined;
});

// Only keep settings for open documents
documents.onDidClose(e => {
  documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
  console.log("Document changed");
  sendDiagnostics(change.document);
});

function getNodeByIndex(res: AST.Node, index: number) {
  let node = res;
  while (node.children && node.children.length) {
    let n = node.children.find(
      child =>
        child.sourceMap.endIndex >= index && child.sourceMap.startIndex <= index
    );
    if (n) {
      node = n;
    } else {
      break;
    }
  }
  return node;
}

function parseDocument(doc:TextDocument): AST.Node {
  // In this simple example we get the settings for every validate run.
  //let settings = await getDocumentSettings(textDocument.uri);

  // The validator creates diagnostics for all uppercase words length 2 and more
  const text = doc.getText();
  const res = AST.parse(text, ShaderLab.Definitions.root, definitions);
  return res;
  // let pattern = /\b[A-Z]{2,}\b/g;
  // let m: RegExpExecArray | null;
  // console.log(text);

  // let problems = 0;
  // while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
  //   problems++;
  //   let diagnostic: Diagnostic = {
  //     severity: DiagnosticSeverity.Warning,
  //     range: {
  //       start: textDocument.positionAt(m.index),
  //       end: textDocument.positionAt(m.index + m[0].length)
  //     },
  //     message: `${m[0]} is all uppercase.`,
  //     source: "ex"
  //   };
  //   if (hasDiagnosticRelatedInformationCapability) {
  //     diagnostic.relatedInformation = [
  //       {
  //         location: {
  //           uri: textDocument.uri,
  //           range: Object.assign({}, diagnostic.range)
  //         },
  //         message: "Spelling matters"
  //       },
  //       {
  //         location: {
  //           uri: textDocument.uri,
  //           range: Object.assign({}, diagnostic.range)
  //         },
  //         message: "Particularly for names"
  //       }
  //     ];
  //   }
  //   diagnostics.push(diagnostic);
  // }

  // // Send the computed diagnostics to VSCode.
  // connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

function sendDiagnostics(doc: TextDocument) {
  let diagnostics: Diagnostic[] = [];
  const res = parseDocument(doc);
  function getErrors(node:AST.Node) {
    node.errors.forEach(error=>{
      diagnostics.push({
        severity:DiagnosticSeverity.Error,
        range: {
          start:doc.positionAt(error.startIndex),
          end:doc.positionAt(error.endIndex||error.startIndex+1),
        },
        message: error.description||""
      })
    })
    node.children.forEach(child=>{
      getErrors(child);
    })
  }
  getErrors(res);
  connection.sendDiagnostics({uri:doc.uri,diagnostics})
}

connection.onDidChangeWatchedFiles(_change => {
  // Monitored files have change in VSCode
  connection.console.log("We received an file change event");
});

// This handler provides the initial list of the completion items.
connection.onCompletion((e: TextDocumentPositionParams): CompletionItem[] => {
  const doc = documents.get(e.textDocument.uri);
  if (doc) {
    const node = getNodeByIndex(
      parseDocument(doc),
      doc.offsetAt(e.position)
    );
    return (node.definition.children || [])
      .filter(def => definitions[def.type].keyword)
      .map((def, i) => ({
        label: definitions[def.type].keyword || "",
        kind: CompletionItemKind.Keyword,
        data: 1
      }));
  }

  return [];
});

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
  (item: CompletionItem): CompletionItem => {
    if (item.data === 1) {
      item.detail = "Keyword";
    }
    return item;
  }
);

/*
connection.onDidOpenTextDocument((params) => {
	// A text document got opened in VSCode.
	// params.textDocument.uri uniquely identifies the document. For documents store on disk this is a file URI.
	// params.textDocument.text the initial full content of the document.
	connection.console.log(`${params.textDocument.uri} opened.`);
});
connection.onDidChangeTextDocument((params) => {
	// The content of a text document did change in VSCode.
	// params.textDocument.uri uniquely identifies the document.
	// params.contentChanges describe the content changes to the document.
	connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
});
connection.onDidCloseTextDocument((params) => {
	// A text document got closed in VSCode.
	// params.textDocument.uri uniquely identifies the document.
	connection.console.log(`${params.textDocument.uri} closed.`);
});
*/

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
