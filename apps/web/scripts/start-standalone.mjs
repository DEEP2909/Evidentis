import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const standaloneRoot = path.join(appRoot, ".next", "standalone", "apps", "web");
const standaloneNextRoot = path.join(standaloneRoot, ".next");

const sourceStatic = path.join(appRoot, ".next", "static");
const targetStatic = path.join(standaloneNextRoot, "static");
const sourcePublic = path.join(appRoot, "public");
const targetPublic = path.join(standaloneRoot, "public");

function copyDirectoryIfPresent(source, target) {
  if (!fs.existsSync(source)) {
    return;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true, force: true });
}

copyDirectoryIfPresent(sourceStatic, targetStatic);
copyDirectoryIfPresent(sourcePublic, targetPublic);

const standaloneServerPath = path.join(standaloneRoot, "server.js");
if (!fs.existsSync(standaloneServerPath)) {
  throw new Error(`Standalone server not found at ${standaloneServerPath}`);
}

const serverProcess = spawn(process.execPath, [standaloneServerPath], {
  stdio: "inherit",
  env: process.env,
});

serverProcess.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

serverProcess.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
