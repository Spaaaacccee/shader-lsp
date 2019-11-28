export interface Settings {
  dxcPath: string;
  includePaths: string[];
}

export class Settings {
  static documentSettings: Map<string, Thenable<Settings>> = new Map();

  static globalSettings:Settings = { dxcPath: "dxc", includePaths: [] };
}
export default Settings;
