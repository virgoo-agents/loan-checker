import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const config = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../vercel.json"), "utf8"),
) as {
  services: {
    frontend: { root: string; rewrites: { source: string; destination: string }[] };
    backend: {
      root: string;
      runtime: string;
      entrypoint: string;
      outputDirectory?: string;
    };
  };
  rewrites: { source: string; destination: { service: string } | string }[];
};

describe("vercel hosting contract", () => {
  it("sends /api to the backend service and every other path to the frontend service", () => {
    expect(config.rewrites).toEqual([
      { source: "/api/(.*)", destination: { service: "backend" } },
      { source: "/(.*)", destination: { service: "frontend" } },
    ]);
  });

  it("falls back to index.html only inside the frontend service", () => {
    expect(config.services.frontend.root).toBe("frontend/");
    expect(config.services.frontend.rewrites).toEqual([
      { source: "/(.*)", destination: "/index.html" },
    ]);
    expect(JSON.stringify(config.rewrites)).not.toContain("index.html");
  });

  it("reserves the backend container service and does not publish the SPA from it", () => {
    expect(config.services.backend).toMatchObject({
      root: "backend/",
      runtime: "container",
      entrypoint: "Dockerfile",
    });
    expect(config.services.backend.outputDirectory).toBeUndefined();
  });
});
