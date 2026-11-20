import { describe, expect, it } from "vitest";
import { inviteLink, parseInviteCode, prettyCode } from "./inviteLink.ts";

describe("parseInviteCode", () => {
  it.each([
    ["ABCDEFGH", "ABCDEFGH"],
    ["abcd-efgh", "ABCDEFGH"],
    [" ABCD EFGH ", "ABCDEFGH"],
    ["48UQC72P", "48UQC72P"],
  ])("%s → %s", (input, out) => expect(parseInviteCode(input)).toBe(out));

  it.each([[""], ["ABCDEFG"], ["ABCDEFGHJ"], ["ABCD0FGH"], ["ABCDIFGH"], ["<script>"], [null]])("geçersiz: %s", (input) =>
    expect(parseInviteCode(input)).toBeNull(),
  );
});

describe("inviteLink", () => {
  it("link ve okunur kod", () => {
    expect(inviteLink("https://yersen.aegis.net.tr", "ABCDEFGH")).toBe("https://yersen.aegis.net.tr/?davet=ABCDEFGH");
    expect(prettyCode("ABCDEFGH")).toBe("ABCD-EFGH");
  });
});
