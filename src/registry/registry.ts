

export abstract class Registry {
  connected: boolean;
  abstract connect(): Promise<void>
  abstract create(nodePath: string, value: string, mode: number): Promise<string | void>
  abstract exists(nodePath: string): Promise<boolean>
  abstract children(path: string, watcher?: (...args: any[]) => any): Promise<string[]>
}