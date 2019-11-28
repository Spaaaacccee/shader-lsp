export enum RunTrigger {
	onSave,
	onType,
	never
  }

export namespace RunTrigger {
  "use strict";
  export let strings = {
    onSave: "onSave",
    onType: "onType",
    never: "never"
  };
  export let from = function (value: string): RunTrigger {
    if (value === "onSave") {
      return RunTrigger.onSave;
    }
    else if (value === "onType") {
      return RunTrigger.onType;
    }
    else {
      return RunTrigger.never;
    }
  };
}
