import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import webPackage from "../../package.json";

/** Resolved on the server so Git and build environment values stay out of browser bundles. */
function getBuildCommit(): string | null {
  const configuredCommit = process.env.BUILD_COMMIT?.trim();

  if (configuredCommit) {
    return configuredCommit.slice(0, 7);
  }

  try {
    return execFileSync("git", ["rev-parse", "--short=7", "HEAD"], {
      cwd: fileURLToPath(new URL("../../", import.meta.url)),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim().slice(0, 7);
  } catch {
    // Source archives and repositories without commits still have a package version.
    return null;
  }
}

export const version = webPackage.version;

export const buildCommit = getBuildCommit();
