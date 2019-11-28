"use strict";

import * as cp from "child_process";
import * as fs from "fs";
import tempfile from "tempfile";
import {
  TextDocument,
  Diagnostic,
  DiagnosticSeverity,
  Disposable
} from "vscode-languageserver";
import { RunTrigger } from "./RunTrigger";
import { ThrottledDelayer } from "./Throttler";
import { dirname, resolve } from "path";

class CompilerOutputParser {
  private data: string = "";
  private filename: string;
  private document: TextDocument;

  private diagnostics: Diagnostic[] = [];

  private lineOffset: number = 0;

  constructor(filename_: string, document_: TextDocument) {
    this.filename = filename_;
    this.document = document_;
  }

  public write(buffer: Buffer) {
    this.data += buffer.toString();
    console.log(this.data);
    var newlineIndex = -1;
    while ((newlineIndex = this.data.indexOf("\n")) > -1) {
      this.processLine(this.data.substr(0, newlineIndex));
      this.data = this.data.substr(newlineIndex + 1);
    }
  }

  private processLine(line: string) {
    if (!line.startsWith(this.filename)) {
      if (line.startsWith("In file included from " + this.filename)) {
        const lineNo = parseInt(line.split(":").filter(x=>!/\s/.test(x)).pop() || "") - 1;
        const lineContent = this.document.getText().split("\n")[lineNo];
        this.diagnostics.push({
          message: line,
          severity: DiagnosticSeverity.Error,
          range: {
            start: { character: lineContent.indexOf("#include") - 1, line: lineNo },
            end: { character: lineContent.indexOf("#include")+"#include".length - 1, line: lineNo }
          }
        });
      }
      return;
    }

    let parts: string[] = line.substring(this.filename.length + 1).split(":");

    if (parts.length > 3) {
      let line: number = Math.max(
        0,
        parseInt(parts.shift() || "0") - 1 + this.lineOffset
      );
      let column: number = Math.max(0, parseInt(parts.shift() || "0") - 1);

      const lineContent = this.document.getText().split("\n")[line];

      if (lineContent.match(/^.*\/\/\s*\@[Nn][Oo][Ll][Ii][Nn][Tt].*$/)) {
        return;
      }

      let severityStr: string = (parts.shift() || "").trimLeft();

      let severity: DiagnosticSeverity = DiagnosticSeverity.Information;

      if (0 === severityStr.localeCompare("warning")) {
        severity = DiagnosticSeverity.Warning;
      } else if (0 === severityStr.localeCompare("error")) {
        severity = DiagnosticSeverity.Error;
      } else if (0 === severityStr.localeCompare("note")) {
        severity = DiagnosticSeverity.Hint;
      }

      let message: string = parts.join(":").trim();
      this.diagnostics.push({
        range: {
          start: { line, character: column },
          end: { line, character: column }
        },
        message,
        severity
      });
    }
  }

  public getDiagnostics(): Diagnostic[] {
    return this.diagnostics;
  }

  public setLineOffset(value: number): void {
    this.lineOffset = value;
  }
}

type Options = {
  executable?: string;
  includeDirs?: string[];
};

export default class HLSLLintingProvider implements Disposable {
  public diagnostics: Diagnostic[] = [];

  private executable: string = "dxc.exe";

  private executableNotFound: boolean = false;

  private trigger: RunTrigger = RunTrigger.onType;

  private includeDirs: string[] = [];

  private defaultArgs: string[] = [];

  private delayers: { [key: string]: ThrottledDelayer<any> } = {};

  private documentListener: Disposable = { dispose: () => {} };

  private ifdefs: string[] = [];

  constructor() {}

  public activate(subscriptions: Disposable[]): void {
    // subscriptions.push(commands.registerCommand('hlsl.linter.setifdefs', this.setIfdefs.bind(this)));
    // subscriptions.push(this);
    // workspace.onDidChangeConfiguration(this.loadConfiguration, this, subscriptions);
    // this.loadConfiguration();
    // workspace.onDidOpenTextDocument(this.triggerLint, this, subscriptions);
    // workspace.onDidCloseTextDocument((textDocument) => {
    //     // this.diagnosticCollection.delete(textDocument.uri);
    // }, null, subscriptions);
    // workspace.textDocuments.forEach(this.triggerLint, this);
  }

  public setIfdefs(ifdefs: string) {
    this.ifdefs = JSON.parse(ifdefs);

    // workspace.textDocuments.forEach(this.triggerLint, this);
  }

  private triggerLint(textDocument: TextDocument): void {
    if (textDocument.languageId !== "hlsl" || this.executableNotFound) {
      return;
    }

    if (this.trigger === RunTrigger.never) {
      console.log("HLSL-lint: RunTrigger is set to never");
      // this.diagnosticCollection.filter(textDocument.uri);
      return;
    }

    let key = textDocument.uri.toString();
    let delayer = this.delayers[key];
    if (!delayer) {
      delayer = new ThrottledDelayer<void>(
        this.trigger === RunTrigger.onType ? 250 : 0
      );
      this.delayers[key] = delayer;
    }
    delayer.trigger(() => this.lint(textDocument));
  }

  public lint(
    textDocument: TextDocument,
    settings: Options = { executable: "dxc", includeDirs: [] }
  ): Promise<Diagnostic[]> {
    return new Promise<Diagnostic[]>((res, rej) => {
      let filename = tempfile(".hlsl");

      let cleanup = ((filename: string) => {
        fs.unlink(filename, (err: Error) => {});
      }).bind(this, filename);

      let text = textDocument.getText();
      //   if (textDocument.fileName.endsWith(".ush")) {
      //     text = text.replace(/#pragma\s+once[^\n]*\n/g, "//#pragma once\n");
      //   }

      let executable = settings.executable || "dxc";
      let includeDirs = settings.includeDirs || [];

      let decoder = new CompilerOutputParser(filename, textDocument);

      //   let options = workspace.rootPath
      //     ? { cwd: workspace.rootPath }
      //     : undefined;

      let args: string[] = ["-T", "lib_6_4", "-Od", "-Ges"];

      args.push("-D");
      args.push("VSCODE_HLSL_PREVIEW");

      /* [
                '-Od', // disable optimizations
                '-Ges' // enable strict mode
            ];
            */
      this.ifdefs.forEach(ifdef => {
        args.push("-D");
        args.push(ifdef);
      });

      const re = /\/\/\s*INPUTS(?:\((\w+)\))?:\s*([^\n]+)\s*\n/g;
      //const re = /\/\/\s*INPUTS:\s*([^\n]+)\s*\n/g;

      var symbols: string[] = [];

      var predefined: { [key: string]: string } = {};

      var m;
      while ((m = re.exec(text))) {
        if (m.length === 1) {
          continue;
        }

        var typeName: string = "float";

        if (m.length === 3 && typeof m[1] !== "undefined") {
          typeName = m[1];
        }

        function makeTypeContructor(typeName: string) {
          if (typeof typeName === "undefined") {
            return "0";
          }

          const Constructors: { [key: string]: string } = {
            float: "0.0",
            float2: "float2(0, 0)",
            float3: "float3(0, 0, 0)",
            float4: "float4(0, 0, 0, 0)",
            int: "0",
            int2: "int2(0, 0)",
            int3: "int3(0, 0, 0)",
            int4: "int4(0, 0, 0, 0)"
          };

          if (typeName in Constructors) {
            return Constructors[typeName];
          }

          return null;
        }

        (m.length === 2 ? m[1] : m[2])
          .split(/\s*,\s*/)
          .forEach((symbol: string) => {
            symbol = symbol.trim();
            var existingSymbol = symbols.find(
              s => 0 === s.localeCompare(symbol)
            );
            if (
              typeof existingSymbol === "undefined" ||
              null === existingSymbol
            ) {
              symbols.push(symbol);
              let typeConstructor = makeTypeContructor(typeName);
              if (typeConstructor === null) {
                predefined[symbol] = typeName;
              } else {
                args.push("-D");
                args.push(symbol + "=" + typeConstructor);
              }
            }
          });
      }

      args.push("-I");
      args.push(dirname(textDocument.uri));

      includeDirs.forEach(includeDir => {
        args.push("-I");
        args.push(resolve(includeDir));
      });

      args.push(filename);

      var addedLines = 0;
      let prefix: string = "";
      Object.keys(predefined).forEach(key => {
        prefix += predefined[key] + " " + key + ";\n";
        addedLines = addedLines + 1;
      });

      decoder.setLineOffset(-addedLines);

      text = prefix + text;

      fs.writeFile(
        filename,
        Buffer.from(text, "utf8"),
        ((err: Error) => {
          if (err) {
            console.log("error:", err);
            cleanup();
            rej(err);
            return;
          }

          //console.log(`Starting "${executable} ${args.join(' ')}"`);

          let childProcess = cp.spawn(executable, args, {});
          childProcess.on("error", (error: Error) => {
            console.error("Failed to start DXC:", error);
            if (this.executableNotFound) {
              console.error("DXC executable not found");
              cleanup();
              rej("DXC executable not found");
              return;
            }
            var message: string;
            if ((<any>error).code === "ENOENT") {
              message = `Cannot lint the HLSL file. The ${executable} program was not found.`;
            } else {
              message = error.message
                ? error.message
                : `Failed to run dxc using path: ${executable}. Reason is unknown.`;
            }
            console.log(message);
            this.executableNotFound = true;
            cleanup();
            rej(message);
          });
          if (childProcess.pid) {
            childProcess.stderr.on("data", (data: Buffer) => {
              decoder.write(data);
            });
            childProcess.stderr.on("end", () => {
              let diagnostics: Diagnostic[] = decoder.getDiagnostics();
              if (diagnostics.length) {
                this.diagnostics = diagnostics;
              } else {
                this.diagnostics = [];
              }
              cleanup();
              res(this.diagnostics);
            });
          } else {
            cleanup();
            rej("failed to start DXC");
          }
        }).bind(this)
      );
    });
  }

  private loadConfiguration(): void {
    // let section = workspace.getConfiguration("hlsl");
    // if (section) {
    //   this.executable = section.get<string>(
    //     "linter.executablePath",
    //     "D:\\Desktop\\DXC\\bin\\dxc.exe"
    //   );
    //   this.trigger = RunTrigger.from(
    //     section.get<string>("linter.trigger", RunTrigger.strings.onType)
    //   );
    //   this.includeDirs = section.get<string[]>("linter.includeDirs") || [];
    //   this.defaultArgs = section.get<string[]>("linter.defaultArgs") || [];
    // }
    // if (this.documentListener) {
    //   this.documentListener.dispose();
    // }
    // if (this.trigger === RunTrigger.onType) {
    //   this.documentListener = workspace.onDidChangeTextDocument(e => {
    //     this.triggerLint(e.document);
    //   });
    // } else if (this.trigger === RunTrigger.onSave) {
    //   this.documentListener = workspace.onDidSaveTextDocument(
    //     this.triggerLint,
    //     this
    //   );
    // }
    // // Configuration has changed. Reevaluate all documents.
    // workspace.textDocuments.forEach(this.triggerLint, this);
  }

  public dispose() {}
}

// export function activate(context: ExtensionContext): void {
//   //context.subscriptions.push(//this.setIfdefs.bind(this)));

//   let linter = new HLSLLintingProvider();
//   linter.activate(context.subscriptions);
// }

// export function deactivate() {}
