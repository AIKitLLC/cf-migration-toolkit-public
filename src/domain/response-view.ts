export interface ResponseView {
  url: string;
  status: number;
  headers: ReadonlyMap<string, string>;
  location: string | null;
  body: string;
}
