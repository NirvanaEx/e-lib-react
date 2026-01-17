#!/usr/bin/env node
const { execSync } = require("child_process");

const port = Number.parseInt(process.argv[2], 10);

if (!Number.isInteger(port)) {
  console.error("Usage: kill-port <port>");
  process.exit(1);
}

const tryExec = (command, options = {}) => {
  execSync(command, { stdio: "ignore", ...options });
  return true;
};

const getWindowsPowerShell = () =>
  process.env.WINDIR ? "powershell.exe" : "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe";

const getWindowsCmd = () =>
  process.env.WINDIR ? "cmd.exe" : "/mnt/c/Windows/System32/cmd.exe";

const killWithPowerShell = (psPath) => {
  const command =
    `${psPath} -NoProfile -Command "` +
    `$p=(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue).OwningProcess; ` +
    `if ($p) { $p | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }"`;
  return tryExec(command);
};

const killWithNetstat = (cmdPath) => {
  const output = execSync(
    `${cmdPath} /c "netstat -ano | findstr :${port}"`,
    { encoding: "utf8" }
  );
  const pids = new Set();
  output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const parts = line.split(/\s+/);
      const pid = parts[parts.length - 1];
      if (/^\d+$/.test(pid)) {
        pids.add(pid);
      }
    });
  if (pids.size === 0) return true;
  for (const pid of pids) {
    tryExec(`${cmdPath} /c "taskkill /F /PID ${pid}"`);
  }
  return true;
};

const killWithLsof = () => tryExec(`lsof -ti tcp:${port} | xargs -r kill -9`);

const killWithSs = () => {
  const output = execSync(`ss -lptn 'sport = :${port}'`, { encoding: "utf8" });
  const matches = [...output.matchAll(/pid=(\\d+)/g)].map((match) => match[1]);
  const unique = Array.from(new Set(matches));
  if (unique.length === 0) return true;
  return tryExec(`kill -9 ${unique.join(" ")}`);
};

try {
  if (process.platform === "win32") {
    try {
      killWithPowerShell(getWindowsPowerShell());
    } catch (_err) {
      killWithNetstat(getWindowsCmd());
    }
    process.exit(0);
  }

  if (process.env.WSL_DISTRO_NAME) {
    try {
      killWithPowerShell(getWindowsPowerShell());
      process.exit(0);
    } catch (_err) {
      try {
        killWithNetstat(getWindowsCmd());
        process.exit(0);
      } catch (_err2) {
        // fall back to unix tools below
      }
    }
  }

  try {
    killWithLsof();
  } catch (_err) {
    killWithSs();
  }
} catch (_err) {
  // If the port is already free or tools are missing, do not fail startup.
  process.exit(0);
}
