export function shouldReadBody(status: number, contentType: string | null): boolean {
  if (status >= 300 && status < 400) return false;
  if (contentType === null) return status >= 200 && status < 300;
  return /html|xml/i.test(contentType);
}
