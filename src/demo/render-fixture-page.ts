export function renderFixturePage(canonical: string, path: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(path)}</title>
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta name="robots" content="index, follow">
</head>
<body>
<p>${escapeHtml(path)}</p>
</body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
