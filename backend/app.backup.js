require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const swaggerUi = require("swagger-ui-express");
const openapiSpec = require("./openapi.json");

const sequelize = require("./config/database");
const { connectRedis } = require("./config/redis");
const { apiLimiter, authLimiter } = require("./middleware/rateLimiter");
const { issueCsrfToken, csrfProtection } = require("./middleware/csrf");

const authRoutes = require("./routes/auth");
const facilitiesRoutes = require("./routes/facilities");
const disponibilitesRoutes = require("./routes/disponibilites");
const rendezVousRoutes = require("./routes/rendezvous");
const avisRoutes = require("./routes/avis");
const adminRoutes = require("./routes/admin");
const modulesMedieyeRoutes = require("./routes/modules");
const professionnelRoutes = require("./routes/professionnel");
const produitsRoutes = require("./routes/produits");
const { demarrerRappels } = require("./jobs/rappels");

require("./models/associations");

if (!process.env.JWT_SECRET) {
  console.error("ERREUR: JWT_SECRET n'est pas défini.");
  process.exit(1);
}

const app = express();
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

app.disable("x-powered-by");
app.set("trust proxy", 1);

// Documentation Swagger — montée avant le helmet() global car sa politique
// CSP par défaut bloquerait les scripts inline utilisés par swagger-ui-express.
app.use(
  "/api/docs",
  helmet({ contentSecurityPolicy: false }),
  swaggerUi.serve,
  swaggerUi.setup(openapiSpec, { customSiteTitle: "MédiGuide API — Documentation" })
);

app.use(helmet());
const allowedOrigins = FRONTEND_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin || true);
    } else {
      callback(new Error("Origine non autorisée par CORS"));
    }
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(issueCsrfToken);
app.use(csrfProtection);
app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter);

app.use("/uploads", express.static(require("path").join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/facilities", facilitiesRoutes);
app.use("/api", disponibilitesRoutes);
app.use("/api/rendezvous", rendezVousRoutes);
app.use("/api", avisRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/modules/medieye", modulesMedieyeRoutes);
app.use("/api/professionnel", professionnelRoutes);
app.use("/api/produits", produitsRoutes);

app.get("/", (req, res) => res.json({ message: "Bienvenue sur l'API de MédiGuide !" }));
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use((req, res) => res.status(404).json({ message: "Route introuvable." }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Erreur serveur interne." });
});


module.exports = app;
