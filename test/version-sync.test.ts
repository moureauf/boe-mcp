import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const pkg = JSON.parse(read("package.json"));
const serverManifest = JSON.parse(read("server.json"));
const indexSrc = read("src/index.ts");

// The version lives in four places; a release bumps package.json and these
// must follow. This catches the drift before it ships.
describe("version is in sync across the package", () => {
  it("src/index.ts advertises the package.json version to MCP clients", () => {
    expect(indexSrc).toContain(`version: "${pkg.version}"`);
  });

  it("server.json (MCP registry manifest) matches the package version", () => {
    expect(serverManifest.version).toBe(pkg.version);
    expect(serverManifest.packages[0].identifier).toBe(pkg.name);
    expect(serverManifest.packages[0].version).toBe(pkg.version);
  });

  it("server.json mcp name matches package.json mcpName", () => {
    expect(serverManifest.name).toBe(pkg.mcpName);
  });
});
