import { describe, expect, it } from "vitest";
import {
  pesanGagalDaftar,
  PESAN_DAFTAR_GENERIK,
  PESAN_EMAIL_TERDAFTAR,
  PESAN_RATE_LIMIT,
  PESAN_SANDI_LEMAH,
} from "./pesan-daftar";

describe("pesanGagalDaftar", () => {
  it("server 500 → generic", () => {
    expect(pesanGagalDaftar({ message: "Database error saving new user", status: 500 })).toBe(PESAN_DAFTAR_GENERIK);
  });
  it("message '{}' → generic", () => {
    expect(pesanGagalDaftar({ message: "{}" })).toBe(PESAN_DAFTAR_GENERIK);
  });
  it("empty object → generic", () => {
    expect(pesanGagalDaftar({})).toBe(PESAN_DAFTAR_GENERIK);
  });
  it("empty message → generic", () => {
    expect(pesanGagalDaftar({ message: "  " })).toBe(PESAN_DAFTAR_GENERIK);
  });
  it("database error without status → generic", () => {
    expect(pesanGagalDaftar({ message: "Database error saving new user" })).toBe(PESAN_DAFTAR_GENERIK);
  });
  it("unknown message is not shown raw", () => {
    expect(pesanGagalDaftar({ message: "something odd", status: 400 })).toBe(PESAN_DAFTAR_GENERIK);
  });
  it("weak password", () => {
    expect(pesanGagalDaftar({ message: "Password is known to be weak and easy to guess", status: 422 })).toBe(PESAN_SANDI_LEMAH);
  });
  it("leaked password", () => {
    expect(pesanGagalDaftar({ message: "Password has been pwned", status: 422 })).toBe(PESAN_SANDI_LEMAH);
  });
  it("email already registered", () => {
    expect(pesanGagalDaftar({ message: "User already registered", status: 422 })).toBe(PESAN_EMAIL_TERDAFTAR);
  });
  it("rate limit", () => {
    expect(pesanGagalDaftar({ message: "Email rate limit exceeded", status: 429 })).toBe(PESAN_RATE_LIMIT);
  });
});
