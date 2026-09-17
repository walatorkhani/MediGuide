const jwt = require("jsonwebtoken");
const { getSession } = require("./session");

module.exports = async (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Aucun token." });
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.sid) {
      const session = await getSession(decoded.sid);
      if (!session || Number(session.userId) !== Number(decoded.id)) {
        return res.status(401).json({ message: "Session expirée." });
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalide ou session expirée." });
  }
};
