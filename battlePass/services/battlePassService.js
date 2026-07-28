const fs = require("fs");
const path = require("path");

const SEASONS_PATH = path.join(__dirname, "../data/seasons");
const USERS_PATH = path.join(__dirname, "../data/users");

function loadSeason(seasonId) {
  const file = path.join(SEASONS_PATH, `${seasonId}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function getLatestSeasonId() {
  if (!fs.existsSync(SEASONS_PATH)) return null;
  const files = fs.readdirSync(SEASONS_PATH).filter(f => f.endsWith(".json") && f !== "404.json");
  if (!files.length) return null;
  files.sort();
  return files[files.length - 1].replace(".json", "");
}

function getCurrentSeason() {
  if (fs.existsSync(path.join(SEASONS_PATH, "404.json"))) return null;
  const id = getLatestSeasonId();
  return id ? loadSeason(id) : null;
}

function loadUser(userId) {
  const file = path.join(USERS_PATH, `${userId}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = fs.readFileSync(file, "utf8");
    if (!raw.trim()) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function createUser(userId) {
  return {
    user_id: userId,
    tutorial_step: 0,
    seasons: {},
  };
}

function getSeasonData(user, seasonId) {
  if (!user.seasons) user.seasons = {};
  if (!user.seasons[seasonId]) {
    user.seasons[seasonId] = {
      xp: 0,
      level: 0,
      daily_streak: 0,
      last_message_date: null,
      last_xp_time: null,
      claimed_levels: [],
      xp_today: 0,
    };
  }
  return user.seasons[seasonId];
}

function saveUser(user) {
  const file = path.join(USERS_PATH, `${user.user_id}.json`);
  fs.mkdirSync(USERS_PATH, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(user, null, 2), "utf8");
}

function getLevelFromXp(xp, season) {
  const xpPerLevel = season.xp_per_level || 100;
  const rawLevel = Math.floor(xp / xpPerLevel);
  if (rawLevel <= 100) return rawLevel;
  const bonusXp = xp - 100 * xpPerLevel;
  const bonusLevel = Math.floor(bonusXp / (xpPerLevel * 10));
  return 100 + bonusLevel;
}

function getTotalXpForLevel(level, season) {
  const xpPerLevel = season.xp_per_level || 100;
  if (level <= 100) return level * xpPerLevel;
  return 100 * xpPerLevel + (level - 100) * xpPerLevel * 10;
}

function getLevelsToProcess(userXp, currentLevel, season) {
  const levels = [];
  let lvl = currentLevel + 1;
  while (true) {
    const needed = getTotalXpForLevel(lvl, season);
    if (userXp >= needed) {
      levels.push(lvl);
      lvl++;
    } else {
      break;
    }
  }
  return levels;
}

module.exports = {
  loadSeason,
  getCurrentSeason,
  getLatestSeasonId,
  loadUser,
  createUser,
  getSeasonData,
  saveUser,
  getLevelFromXp,
  getTotalXpForLevel,
  getLevelsToProcess,
};
