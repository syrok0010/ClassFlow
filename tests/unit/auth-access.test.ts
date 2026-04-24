import assert from "node:assert/strict";
import test from "node:test";

import { getDefaultPath } from "@/lib/auth-access";

test("returns /admin for admin user", () => {
  assert.equal(getDefaultPath({ role: "ADMIN", domainRoles: [] }), "/admin");
});

test("returns /teacher for teacher user", () => {
  assert.equal(getDefaultPath({ role: "USER", domainRoles: ["teacher"] }), "/teacher");
});

test("returns /parent for parent user", () => {
  assert.equal(getDefaultPath({ role: "USER", domainRoles: ["parent"] }), "/parent");
});

test("returns /student for student user", () => {
  assert.equal(getDefaultPath({ role: "USER", domainRoles: ["student"] }), "/student");
});

test("prioritizes admin over domain roles", () => {
  assert.equal(getDefaultPath({ role: "ADMIN", domainRoles: ["teacher"] }), "/admin");
});

test("prioritizes teacher over parent", () => {
  assert.equal(getDefaultPath({ role: "USER", domainRoles: ["teacher", "parent"] }), "/teacher");
});

test("returns null when user has no access contexts", () => {
  assert.equal(getDefaultPath({ role: "USER", domainRoles: [] }), null);
});
