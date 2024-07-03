import { configure, processCLIArgs, run } from "@japa/runner";
import StackTracey from "stacktracey";
import { expect } from "@japa/expect";

import { BaseReporter } from "@japa/runner/core";
import {
  GroupEndNode,
  GroupStartNode,
  SuiteEndNode,
  SuiteStartNode,
  TestEndNode,
  TestStartNode,
} from "@japa/runner/types";

function formatMessage({
  command,
  properties,
  message,
}: {
  command: string;
  properties: Record<string, string>;
  message: string;
}): string {
  let result = `::${command}`;
  Object.entries(properties).forEach(([k, v], i) => {
    result += i === 0 ? " " : ",";
    result += `${k}=${escapeProperty(v)}`;
  });
  result += `::${escapeData(message)}`;
  return result;
}

function escapeData(s: string): string {
  return s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

function escapeProperty(s: string): string {
  return s
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A")
    .replace(/:/g, "%3A")
    .replace(/,/g, "%2C");
}

class MyCustomReporter extends BaseReporter {
  static name = "github";

  onTestStart(testPayload: TestStartNode) {
    console.log('test started "%s"', testPayload.title);
  }
  onTestEnd(testPayload: TestEndNode) {
    console.log('test completed "%s"', testPayload.title);
  }

  onGroupStart(groupPayload: GroupStartNode) {
    console.log('group started "%s"', groupPayload.title);
  }
  onGroupEnd(groupPayload: GroupEndNode) {
    console.log('group ended "%s"', groupPayload.title);
  }

  onSuiteStart(suitePayload: SuiteStartNode) {
    console.log('suite started "%s"', suitePayload.name);
  }
  onSuiteEnd(suitePayload: SuiteEndNode) {
    console.log('suite completed "%s"', suitePayload.name);
  }

  async start() {
    console.log("starting");
  }
  async end() {
    const summary = this.runner!.getSummary();
    summary.failureTree.forEach((item) => {
      item.children.forEach((child) => {
        if (child.type === "test") {
          child.errors.forEach((error) => {
            const stack = new StackTracey(error.error);
            const top = stack.items[0];

            console.log(
              formatMessage({
                command: "error",
                properties: {
                  file: top.fileName,
                  line: String(top.line),
                  col: String(top.column),
                  title: child.title,
                },
                message: error.error.message,
              })
            );
          });
        }

        if (child.type === "group") {
          child.children.forEach((test) => {
            test.errors.forEach((error) => {
              const stack = new StackTracey(error.error);
              const top = stack.items[0];

              console.log(
                formatMessage({
                  command: "error",
                  properties: {
                    file: top.fileRelative,
                    line: String(top.line),
                    col: String(top.column),
                    title: test.title,
                  },
                  message: error.error.message,
                })
              );
            });
          });
        }
      });
    });
  }
}

processCLIArgs(process.argv.splice(2));
configure({
  files: ["tests/**/*.spec.ts"],
  plugins: [expect()],
  reporters: {
    activated: ["github"],
    list: [
      {
        name: MyCustomReporter.name,
        handler: (...args) => new MyCustomReporter().boot(...args),
      },
    ],
  },
});

run();
