const crypto = require("crypto");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const COOKIE_NAME = "csrf_token";
const HEADER_NAME = "x-csrf-token";

function issueCsrfToken(req, res, next) {
  let token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    token = crypto.randomBytes(32).toString("hex");
    res.cookie(COOKIE_NAME, token, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    });
  }
  next();
}

function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  // Les appels API doivent présenter le même token que celui envoyé dans le cookie.
  const cookieToken = req.cookies?.[COOKIE_NAME];
  const headerToken = req.get(HEADER_NAME);

  if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length ||
      !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    return res.status(403).json({ message: "Protection CSRF : jeton invalide ou absent." });
  }
  next();
}

module.exports = { issueCsrfToken, csrfProtection, COOKIE_NAME };
