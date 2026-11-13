/**
 * Cookie policy for the in-memory Vite API used only by development previews.
 *
 * Google AI Studio embeds previews in a cross-site frame. Secure, partitioned
 * cookies keep the preview's demo session and CSRF pair available in that
 * frame without weakening the production ASP.NET Core cookie policy.
 */
export function getDevPreviewCookieAttributes(
  forwardedProto: string | string[] | undefined,
  socketEncrypted = false
): string {
  const firstHeaderValue = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  const firstProtocol = firstHeaderValue?.split(',')[0]?.trim().toLowerCase();
  const isHttps = firstProtocol === 'https' || socketEncrypted;

  return isHttps
    ? 'Path=/; SameSite=None; Secure; Partitioned'
    : 'Path=/; SameSite=Strict';
}
