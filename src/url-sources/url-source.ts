export interface UrlSource {
  collect(): Promise<readonly string[]>;
}
