const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "logs");

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getLogFile() {
  ensureLogDir();
  const today = new Date().toISOString().split("T")[0];
  return path.join(LOG_DIR, `${today}.log`);
}

function formatTimestamp() {
  return new Date().toISOString();
}

function log(level, ...args) {
  const message = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  const line = `[${formatTimestamp()}] [${level}] ${message}`;
  console.log(line);
  try {
    fs.appendFileSync(getLogFile(), line + "\n", "utf8");
  } catch {}
}

module.exports = {
  info: (...args) => log("INFO", ...args),
  warn: (...args) => log("WARN", ...args),
  error: (...args) => log("ERROR", ...args),
  debug: (...args) => log("DEBUG", ...args),
};
