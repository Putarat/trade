// วิธีรัน:
//   node start.js
//
// หยุด: Ctrl+C (ปิดทั้ง backend และ frontend พร้อมกัน)
//
// ต้องการก่อนรัน:
//   - backend/.venv มี Django ติดตั้งแล้ว  (pip install -r backend/requirements.txt)
//   - frontend มี node_modules แล้ว         (cd frontend && npm install)

import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ROOT = __dirname;
const BACKEND_DIR = resolve(ROOT, "backend");
const FRONTEND_DIR = resolve(ROOT, "frontend");

const IS_WIN = process.platform === "win32";

const colors = {
  reset: "\x1b[0m",
  backend: "\x1b[36m",  // cyan
  frontend: "\x1b[35m", // magenta
  error: "\x1b[31m",    // red
  info: "\x1b[33m",     // yellow
};

function prefix(name, color) {
  return `${color}[${name}]${colors.reset}`;
}

function spawnProcess(label, color, cmd, args, cwd, env = {}) {
  const pre = prefix(label, color);
  const proc = spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...env },
  });

  proc.stdout.on("data", (d) =>
    d.toString().split("\n").filter(Boolean).forEach((l) => console.log(`${pre} ${l}`))
  );
  proc.stderr.on("data", (d) =>
    d.toString().split("\n").filter(Boolean).forEach((l) => console.error(`${pre} ${colors.error}${l}${colors.reset}`))
  );
  proc.on("exit", (code) => {
    console.log(`${pre} ${colors.info}exited with code ${code}${colors.reset}`);
    // ถ้า process ใดปิด ให้ปิด process อื่นด้วย
    process.exit(code ?? 0);
  });

  return proc;
}

console.log(`${colors.info}Starting backend (Django) and frontend (Vite)...${colors.reset}\n`);

const backend = spawnProcess(
  "backend",
  colors.backend,
  IS_WIN ? "python.exe" : "python",
  ["manage.py", "runserver"],
  BACKEND_DIR
);

// npm บน Windows ต้องรันผ่าน cmd
const frontend = spawnProcess(
  "frontend",
  colors.frontend,
  IS_WIN ? "cmd.exe" : "npm",
  IS_WIN ? ["/c", "npm", "run", "dev"] : ["run", "dev"],
  FRONTEND_DIR
);

// จัดการ Ctrl+C ให้ปิดทั้งสองพร้อมกัน
process.on("SIGINT", () => {
  console.log(`\n${colors.info}Shutting down...${colors.reset}`);
  backend.kill("SIGINT");
  frontend.kill("SIGINT");
  process.exit(0);
});
