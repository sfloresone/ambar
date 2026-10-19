import { describe, expect, test } from "bun:test";

import { readAuthReturn } from "./auth-return.ts";

const read = (query: string) => readAuthReturn(new URLSearchParams(query));

describe("readAuthReturn", () => {
  test("the email link", () => {
    expect(read("verify=abc")).toEqual({ kind: "verify", token: "abc" });
  });

  test("a provider sign-in", () => {
    expect(read("entry=iris&oauth=created")).toEqual({ kind: "provider", created: true });
    expect(read("oauth=signed-in")).toEqual({ kind: "provider", created: false });
  });

  test("a provider error, unknown codes as oauth-failed", () => {
    expect(read("error=oauth-email")).toEqual({ kind: "error", code: "oauth-email" });
    expect(read("error=oauth-something-new")).toEqual({ kind: "error", code: "oauth-failed" });
  });

  test("nothing to do", () => {
    expect(read("")).toBeNull();
    expect(read("oauth=maybe&error=other")).toBeNull();
    expect(read("verify=")).toBeNull();
  });
});
