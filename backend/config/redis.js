const { createClient } = require("redis");

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

const redis = createClient({
  url: redisUrl,
  socket: {
    connectTimeout: 2000,
    reconnectStrategy: false,
  },
});

let redisReady = false;

redis.on("ready", () => {
  redisReady = true;
  console.log(`Redis connecté (${redisUrl}).`);
});

redis.on("error", (err) => {
  // Ne pas afficher une boucle infinie d'erreurs
  if (redisReady) {
    console.error("Redis:", err.message);
  }
  redisReady = false;
});

redis.on("end", () => {
  redisReady = false;
});

async function connectRedis() {
  if (redisReady && redis.isReady) {
    return redis;
  }

  try {
    if (!redis.isOpen) {
      await redis.connect();
    }

    if (redis.isReady) {
      redisReady = true;
      console.log(`Redis connecté (${redisUrl}).`);
      return redis;
    }

    return null;
  } catch (err) {
    redisReady = false;

    console.warn(
      "Redis indisponible : cache désactivé, l'application continue sans Redis."
    );

    // Important : fermer proprement le client après l'échec
    try {
      if (redis.isOpen) {
        await redis.disconnect();
      }
    } catch (_) {}

    return null;
  }
}

function isRedisReady() {
  return redisReady && redis.isReady;
}

module.exports = {
  redis,
  connectRedis,
  isRedisReady,
};