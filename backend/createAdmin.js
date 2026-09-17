require("dotenv").config();

const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function createAdmin() {
  try {
    const password = await bcrypt.hash("123456", 10);

    const admin = await User.create({
      nom: "Admin MediGuide",
      email: "admin2@mediguide.com",
      motDePasse: password,
      role: "administrateur",
      estValide: true
    });

    console.log("Admin créé avec succès");
    console.log(admin.email);

    process.exit();
  } catch (error) {
    console.log("Erreur :", error.message);
    process.exit(1);
  }
}

createAdmin();