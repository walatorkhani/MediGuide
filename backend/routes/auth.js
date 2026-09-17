const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const { validate, z } = require("../middleware/validate");
const { createSession, getSession, rotateSession, deleteSession } = require("../middleware/session");
const { envoyerEmail, emailVerification } = require("../utils/mailer");
const { getPermissions } = require("../config/permissions");

const ROLES_AUTORISES = ["patient", "professionnel"];
const CATEGORIES_PRO = ["medecin", "pharmacie", "parapharmacie"];

router.get("/csrf", (req, res) => res.json({ ok: true }));

const registerSchema = z
  .object({
    nom: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(160).transform((v) => v.toLowerCase()),
    motDePasse: z.string().min(8).max(128),
    role: z.enum(["patient", "professionnel"]).optional(),
    // Requis uniquement pour role === "professionnel" : précise si le
    // compte s'inscrit en tant que médecin, pharmacie ou parapharmacie.
    categorieProfessionnelle: z.enum(CATEGORIES_PRO).optional(),
  })
  .refine(
    (data) => data.role !== "professionnel" || CATEGORIES_PRO.includes(data.categorieProfessionnelle),
    {
      message: "Veuillez préciser si vous vous inscrivez en tant que médecin, pharmacie ou parapharmacie.",
      path: ["categorieProfessionnelle", "emailVerifie"],
    }
  );

const loginSchema = z.object({
  email: z.string().trim().email().max(160).transform((v) => v.toLowerCase()),
  motDePasse: z.string().min(1).max(128),
});

const isProduction = () => process.env.NODE_ENV === "production";

router.post("/register", validate(registerSchema), async (req,res)=>{
 try{
  const {nom,email,motDePasse,role,categorieProfessionnelle}=req.body;
  if(await User.findOne({where:{email}})) return res.status(400).json({message:"Cet email existe déjà."});
  const isTest=process.env.NODE_ENV==="test";
  const code=crypto.randomInt(100000,1000000).toString();
  await User.create({nom,email,motDePasse:await bcrypt.hash(motDePasse,12),role:role||"patient",categorieProfessionnelle:role==="professionnel"?categorieProfessionnelle:null,estValide:role==="professionnel"?false:true,emailVerifie:isTest,codeVerificationEmail:isTest?null:crypto.createHash("sha256").update(code).digest("hex"),codeVerificationExpireAt:isTest?null:new Date(Date.now()+600000)});
  if(!isTest) await envoyerEmail({to:email,subject:"Votre code de vérification — MédiGuide",html:emailVerification({nom,code})});
  res.status(201).json({message:isTest?(role==="professionnel"?"Compte créé. En attente de validation.":"Compte créé avec succès."):"Compte créé. Un code de vérification a été envoyé à votre adresse e-mail.",verificationRequired:!isTest,email,devVerificationCode:(!isTest&&process.env.NODE_ENV!=="production"&&!process.env.SMTP_HOST)?code:undefined});
 }catch(err){console.error(err);res.status(500).json({message:"Erreur serveur."})}
});

router.post("/verify-email", validate(z.object({email:z.string().trim().email().max(160).transform(v=>v.toLowerCase()),code:z.string().regex(/^\d{6}$/,"Le code doit contenir 6 chiffres.")})), async(req,res)=>{
 try{
  const {email,code}=req.body; const user=await User.findOne({where:{email}});
  if(!user)return res.status(404).json({message:"Compte introuvable."});
  if(user.emailVerifie)return res.json({message:"Adresse e-mail déjà vérifiée.",verified:true});
  if(!user.codeVerificationEmail||!user.codeVerificationExpireAt||new Date(user.codeVerificationExpireAt)<new Date())return res.status(400).json({message:"Code expiré. Demandez un nouveau code."});
  const hash=crypto.createHash("sha256").update(code).digest("hex");
  if(hash!==user.codeVerificationEmail)return res.status(400).json({message:"Code incorrect."});
  user.emailVerifie=true;user.codeVerificationEmail=null;user.codeVerificationExpireAt=null;await user.save();
  res.json({message:"Adresse e-mail vérifiée. Votre compte est activé.",verified:true});
 }catch(err){console.error(err);res.status(500).json({message:"Erreur serveur."})}
});

router.post("/resend-verification", validate(z.object({email:z.string().trim().email().max(160).transform(v=>v.toLowerCase())})), async(req,res)=>{
 try{
  const {email}=req.body; const user=await User.findOne({where:{email}});
  if(!user)return res.status(404).json({message:"Compte introuvable."});
  if(user.emailVerifie)return res.json({message:"Adresse e-mail déjà vérifiée."});
  const code=crypto.randomInt(100000,1000000).toString();user.codeVerificationEmail=crypto.createHash("sha256").update(code).digest("hex");user.codeVerificationExpireAt=new Date(Date.now()+600000);await user.save();
  await envoyerEmail({to:email,subject:"Nouveau code de vérification — MédiGuide",html:emailVerification({nom:user.nom,code})});
  res.json({message:"Un nouveau code a été envoyé.",devVerificationCode:(!isProduction()&&!process.env.SMTP_HOST)?code:undefined});
 }catch(err){console.error(err);res.status(500).json({message:"Erreur serveur."})}
});

router.post("/login", validate(loginSchema), async(req,res)=>{
 try{
  const {email,motDePasse}=req.body; const user=await User.findOne({where:{email}});
  if(!user)return res.status(401).json({message:"Email ou mot de passe incorrect."});
  if(!user.emailVerifie&&process.env.NODE_ENV!=="test")return res.status(403).json({message:"Veuillez vérifier votre adresse e-mail avec le code reçu."});
  if(user.role==="professionnel"&&!user.estValide)return res.status(403).json({message:"Compte non validé."});
  if(!await bcrypt.compare(motDePasse,user.motDePasse))return res.status(401).json({message:"Email ou mot de passe incorrect."});
  const session=await createSession(user); const permissions=getPermissions(user.role);
  res.json({token:session.accessToken,refreshToken:session.refreshToken,sessionId:session.sessionId,expiresIn:900,user:{id:user.id,nom:user.nom,email:user.email,role:user.role,categorieProfessionnelle:user.categorieProfessionnelle,emailVerifie:user.emailVerifie,permissions}});
 }catch(err){console.error(err);res.status(500).json({message:"Erreur serveur."})}
});

router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken, sessionId } = req.body || {};
    if (!refreshToken || !sessionId) return res.status(401).json({ message: "Session de rafraîchissement invalide." });

    const session = await getSession(sessionId);
    if (!session || session.refreshToken !== refreshToken) {
      return res.status(401).json({ message: "Session expirée." });
    }

    const user = await User.findByPk(session.userId);
    if (!user) {
      await deleteSession(sessionId);
      return res.status(401).json({ message: "Utilisateur introuvable." });
    }

    const rotated = await rotateSession(sessionId, user);
    res.json({ token: rotated.accessToken, refreshToken: rotated.refreshToken, sessionId, expiresIn: 900 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Impossible de renouveler la session." });
  }
});

router.post("/logout", authMiddleware, async (req, res) => {
  await deleteSession(req.user.sid);
  res.json({ message: "Déconnexion réussie." });
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "nom", "email", "role", "estValide", "categorieProfessionnelle", "emailVerifie"],
    });
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });
    res.json({ user: { ...user.toJSON(), permissions: getPermissions(user.role) } });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur." });
  }
});

module.exports = router;
