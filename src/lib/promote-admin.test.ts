import { describe, expect, it } from "vitest";

import { pesanGagalPromosi } from "./promote-admin";

describe("pesanGagalPromosi", () => {
  it("non-owner caller is refused", () => {
    expect(pesanGagalPromosi("BUKAN_PEMILIK")).toContain("Hanya Pemilik");
  });
  it("self-promotion is refused", () => {
    expect(pesanGagalPromosi("TARGET_DIRI_SENDIRI")).toContain("akun Anda sendiri");
  });
  it("target with history lists each dependency", () => {
    expect(pesanGagalPromosi("PUNYA_RIWAYAT:kontrak,deposit")).toContain("kontrak, deposit");
  });
});
