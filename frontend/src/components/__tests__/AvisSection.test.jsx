import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import AvisSection from "../AvisSection";
import { getAvis, creerAvis, supprimerAvis } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { I18nProvider } from "../../i18n/I18nContext";

vi.mock("../../services/api", () => ({
  getAvis: vi.fn(),
  creerAvis: vi.fn(),
  supprimerAvis: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

function renderAvis(props = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <AvisSection facilityId={7} {...props} />
      </QueryClientProvider>
    </I18nProvider>
  );
}

describe("AvisSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getAvis.mockResolvedValue({
      data: {
        avis: [
          { id: 1, note: 4, commentaire: "Très bon accueil.", patientId: 100, patient: { nom: "Amine" } },
        ],
        moyenne: 4,
        total: 1,
        totalPages: 1,
      },
    });

    creerAvis.mockResolvedValue({ data: { message: "Avis publié." } });
    supprimerAvis.mockResolvedValue({ data: { message: "Avis supprimé." } });
  });

  it("affiche la moyenne et la liste des avis existants", async () => {
    useAuth.mockReturnValue({ user: null, isAuthenticated: false });

    renderAvis();

    expect(await screen.findByText("4.0/5")).toBeInTheDocument();
    expect(screen.getByText("(1)")).toBeInTheDocument();
    expect(screen.getByText("Très bon accueil.")).toBeInTheDocument();
    expect(screen.getByText("Amine")).toBeInTheDocument();
  });

  it("n'affiche pas le formulaire de publication pour un visiteur non connecté", async () => {
    useAuth.mockReturnValue({ user: null, isAuthenticated: false });

    renderAvis();

    await screen.findByText("Amine");
    expect(screen.queryByText("Publier mon avis")).not.toBeInTheDocument();
  });

  it("un patient peut sélectionner une note puis publier un avis", async () => {
    useAuth.mockReturnValue({ user: { id: 42, role: "patient" }, isAuthenticated: true });
    const user = userEvent.setup();

    renderAvis();

    await screen.findByText("Amine");

    const bouton = screen.getByRole("button", { name: "Publier mon avis" });
    expect(bouton).toBeDisabled();

    const etoiles = screen.getAllByRole("button").filter((b) => b !== bouton);
    // Les 5 premiers boutons interactifs correspondent au sélecteur d'étoiles.
    await user.click(etoiles[2]); // sélectionne 3 étoiles

    expect(bouton).toBeEnabled();

    await user.click(bouton);

    await waitFor(() => expect(creerAvis).toHaveBeenCalledWith(7, 3, ""));
  });

  it("l'auteur d'un avis peut le supprimer", async () => {
    useAuth.mockReturnValue({ user: { id: 100, role: "patient" }, isAuthenticated: true });
    const user = userEvent.setup();

    renderAvis();

    await screen.findByText("Amine");

    const supprimer = screen.getByTitle("Supprimer mon avis");
    await user.click(supprimer);

    await waitFor(() => expect(supprimerAvis).toHaveBeenCalledWith(1));
  });
});
