// SMTP désactivé avant le require de utils/mailer, pour tester le mode
// "simulé" (aucun SMTP configuré) sans jamais tenter de vraie connexion
// réseau pendant les tests.
process.env.SMTP_HOST = "";
process.env.SMTP_USER = "";
process.env.SMTP_PASSWORD = "";

const { envoyerEmail, emailConfirmationRDV, emailRappelRDV } = require("../utils/mailer");

describe("utils/mailer", () => {
  test("envoyerEmail simule l'envoi quand le SMTP n'est pas configuré", async () => {
    const res = await envoyerEmail({ to: "patient@test.com", subject: "Sujet", html: "<p>Contenu</p>" });
    expect(res).toEqual({ simule: true });
  });

  test("emailConfirmationRDV génère un contenu HTML avec les informations du rendez-vous", () => {
    const html = emailConfirmationRDV({
      patientNom: "Ali Ben Salem",
      facilityNom: "Dr Test Cardiologie",
      date: "2026-09-15",
      heureDebut: "09:00",
      heureFin: "09:20",
      adresse: "Avenue Habib Bourguiba, Jendouba",
    });

    expect(html).toContain("Ali Ben Salem");
    expect(html).toContain("Dr Test Cardiologie");
    expect(html).toContain("09:00");
    expect(html).toContain("09:20");
    expect(html).toContain("Avenue Habib Bourguiba, Jendouba");
  });

  test("emailConfirmationRDV fonctionne sans adresse fournie", () => {
    const html = emailConfirmationRDV({
      patientNom: "Sami",
      facilityNom: "Dr Sans Adresse",
      date: "2026-09-16",
      heureDebut: "10:00",
      heureFin: "10:20",
    });
    expect(html).toContain("Sami");
    expect(html).not.toContain("undefined");
  });

  test("emailRappelRDV génère un contenu HTML de rappel", () => {
    const html = emailRappelRDV({
      patientNom: "Sami Trabelsi",
      facilityNom: "Dr Test Dermatologie",
      date: "2026-09-16",
      heureDebut: "10:00",
      heureFin: "10:20",
    });

    expect(html).toContain("Sami Trabelsi");
    expect(html).toContain("Dr Test Dermatologie");
    expect(html).toContain("rendez-vous demain");
  });
});
