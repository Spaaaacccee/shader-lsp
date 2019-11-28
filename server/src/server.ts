import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  TextDocumentPositionParams
} from "vscode-languageserver";

import ShaderLab from "./shaderlab/ShaderLab";
import globalSettings, { Settings } from "./Settings";

let connection = createConnection(ProposedFeatures.all);

let documents: TextDocuments = new TextDocuments();

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;

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

connection.onDidChangeConfiguration(change => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    Settings.documentSettings.clear();
  } else {
    Settings.globalSettings = <Settings>{
      ...globalSettings,
      ...(change.settings.shaderlabLanguageServer || {})
    };
  }
  documents.all().forEach(x => {
    refreshDocumentSettings(x.uri);
    ShaderLab.LSP.provideDiagnostics({ document: x }, connection);
  });
});

async function refreshDocumentSettings(resource: string): Promise<void> {
  if (!hasConfigurationCapability) {
    return;
  }
  let result = Settings.documentSettings.get(resource);
  if (!result) {
    result = await connection.workspace.getConfiguration({
      scopeUri: resource,
      section: "shaderlabLanguageServer"
    });
    if (result) {
      Settings.documentSettings.set(resource, result);
    }
  }
  return;
}

connection.onHover(e => {
  const document = documents.get(e.textDocument.uri);
  if (document) {
    return ShaderLab.LSP.provideHover(document, e.position);
  } else return undefined;
});

// Only keep settings for open documents
documents.onDidClose(e => {
  Settings.documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(async change => {
  await refreshDocumentSettings(change.document.uri);
  ShaderLab.LSP.provideDiagnostics(change, connection);
});

// This handler provides the initial list of the completion items.
connection.onCompletion((e: TextDocumentPositionParams): CompletionItem[] => {
  const doc = documents.get(e.textDocument.uri);
  if (doc) {
    return ShaderLab.LSP.provideCompletion(doc, e.position);
  } else return [];
});

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
  (item: CompletionItem): CompletionItem =>
    ShaderLab.LSP.provideCompletionResolve(item)
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
