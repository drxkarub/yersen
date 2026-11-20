// Davet kodu: 8 karakter, 0/O/1/I yok (api/src/domain/invites.ts ile aynı alfabe).
const CODE = /^[A-HJ-NP-Z2-9]{8}$/;

/** Elle yazılmış ya da linkten gelen kodu temizler; geçerli biçimde değilse null. */
export function parseInviteCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const code = input.toUpperCase().replace(/[\s-]+/g, "");
  return CODE.test(code) ? code : null;
}

export const prettyCode = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

/** Paylaşılan link: açan kişide kod kendiliğinden dolar. */
export const inviteLink = (origin: string, code: string) => `${origin}/?davet=${code}`;
