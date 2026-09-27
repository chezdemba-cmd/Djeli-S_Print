export function normalizeServerUrl(value: string, allowedHosts?: string[]) {
  const url = new URL(value.trim());
  const localDevelopment = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !localDevelopment) throw new Error("L’URL du serveur doit utiliser HTTPS.");
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("URL du serveur invalide.");
  if (allowedHosts && allowedHosts.length > 0 && !localDevelopment && !allowedHosts.includes(url.hostname)) {
    throw new Error("Ce serveur n’est pas autorisé pour cet agent.");
  }
  return url.origin;
}
