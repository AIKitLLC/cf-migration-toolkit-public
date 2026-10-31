export interface RedirectRule {
  from: string;
  to: string;
  status: number | null;
  force: boolean;
  query: readonly string[];
  conditions: readonly string[];
}
