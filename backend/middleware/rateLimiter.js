const rateLimit = require("express-rate-limit");

const common = {
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Trop de requêtes. Veuillez réessayer dans quelques instants." },
};

const apiLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 300,
});

const authLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skip: () => process.env.NODE_ENV === "test",
  message: { message: "Trop de tentatives de connexion/inscription. Réessayez plus tard." },
});

module.exports = { apiLimiter, authLimiter };
