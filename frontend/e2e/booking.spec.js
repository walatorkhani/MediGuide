import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const statePath = path.resolve("e2e/.e2e-state.json");
const state = fs.existsSync(statePath)
  ? JSON.parse(fs.readFileSync(statePath, "utf8"))
  : {};

// Le globalSetup prépare un médecin et un créneau stables.
// On utilise donc l'état généré plutôt qu'un E2E_FACILITY_ID potentiellement
// ancien injecté dans l'environnement.
const email = state.email || process.env.E2E_PATIENT_EMAIL;
const password = process.env.E2E_PATIENT_PASSWORD || "MotDePasse123!";
const facilityId = state.facilityId;
const e2eDate = state.date;

test.describe("MédiGuide - réservation de rendez-vous", () => {
  test("RDV de bout en bout : connexion → fiche médecin → créneau → confirmation", async ({ page }) => {
    test.skip(
      !email || !password || !facilityId,
      "Le scénario E2E nécessite un patient et un médecin de test."
    );

    // 1. Connexion
    await page.goto("/login");
    // Les placeholders/labels sont traduits selon la langue active.
    // On cible donc les contrôles HTML stables plutôt que leur texte visible.
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('form button:not([type="button"])').click();

    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

    // 2. Fiche médecin
    await page.goto(`/etablissement/${facilityId}`);
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10_000 });

    const bookingButton = page.getByRole("button", {
      name: /Prendre rendez-vous/i,
    });
    await expect(bookingButton).toBeVisible({ timeout: 10_000 });
    await bookingButton.click();

    // 3. Tunnel de réservation
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByText("Prendre rendez-vous", { exact: true })).toBeVisible();

    // 4. Choisir le jour préparé par globalSetup.
    // Le jour E2E est le lendemain et dispose d'au moins un créneau.
    const date = e2eDate ? new Date(`${e2eDate}T12:00:00`) : null;
    const dayNumber = date ? String(date.getDate()).padStart(2, "0") : null;

    let dateButton = dayNumber
      ? dialog.getByRole("button").filter({
          hasText: new RegExp(`\\b${dayNumber}\\b`),
        }).first()
      : dialog.getByRole("button").filter({ hasText: /\d{2}/ }).first();

    if (await dateButton.count() === 0) {
      dateButton = dialog.getByRole("button").filter({ hasText: /\d{2}/ }).first();
    }

    await expect(dateButton).toBeVisible({ timeout: 10_000 });
    await dateButton.click();

    // 5. Choisir un créneau horaire
    const availableSlot = dialog
      .getByRole("button")
      .filter({ hasText: /^\s*\d{2}:\d{2}\s*$/ })
      .first();

    await expect(availableSlot).toBeVisible({ timeout: 15_000 });
    await availableSlot.click();

    // 6. Confirmer
    const confirm = dialog.getByRole("button", {
      name: "Confirmer le rendez-vous",
    });
    await expect(confirm).toBeVisible({ timeout: 10_000 });
    await confirm.click();

    // 7. Confirmation finale
    await expect(dialog.getByText("Rendez-vous confirmé !", { exact: true }))
      .toBeVisible({ timeout: 15_000 });
  });
});
