const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { redis, isRedisReady } = require("../config/redis");
const { getPermissions } = require("../config/permissions");

const ACCESS_TTL = 15 * 60;
const REFRESH_TTL = 7 * 24 * 60 * 60;

async function createSession(user) {
  const sessionId = isRedisReady() ? crypto.randomUUID() : null;
  const refreshToken = isRedisReady() ? crypto.randomBytes(48).toString("hex") : null;

  const accessPayload = { id: user.id, role: user.role, permissions: getPermissions(user.role) };
  if (sessionId) accessPayload.sid = sessionId;

  const accessToken = jwt.sign(accessPayload, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TTL,
  });

  if (isRedisReady()) {
    await redis.set(`session:${sessionId}`, JSON.stringify({
      userId: user.id,
      role: user.role,
      permissions: getPermissions(user.role),
      refreshToken,
    }), { EX: REFRESH_TTL });
  }

  return { accessToken, refreshToken, sessionId };
}

async function getSession(sessionId) {
  if (!isRedisReady()) return null;
  const raw = await redis.get(`session:${sessionId}`);
  return raw ? JSON.parse(raw) : null;
}

async function deleteSession(sessionId) {
  if (isRedisReady() && sessionId) await redis.del(`session:${sessionId}`);
}

async function rotateSession(sessionId, user) {
  const session = await getSession(sessionId);
  if (!session) return null;

  const refreshToken = crypto.randomBytes(48).toString("hex");
  const accessToken = jwt.sign(
    { id: user.id, role: user.role, permissions: getPermissions(user.role), sid: sessionId },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TTL }
  );

  await redis.set(`session:${sessionId}`, JSON.stringify({
    userId: user.id, role: user.role, permissions: getPermissions(user.role), refreshToken,
  }), { EX: REFRESH_TTL });

  return { accessToken, refreshToken, sessionId };
}

module.exports = { createSession, getSession, deleteSession, rotateSession };
