import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import BookingTunnel from "../BookingTunnel";
import { getDisponibilites, reserverCreneau } from "../../services/api";
import { I18nProvider } from "../../i18n/I18nContext";

vi.mock("../../services/api", () => ({
  getDisponibilites: vi.fn(),
  reserverCreneau: vi.fn(),
}));

const facility = {
  id: 42,
  nom: "Dr Test MédiGuide",
  specialite: "Médecin généraliste",
};

function renderBooking() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <BookingTunnel facility={facility} onClose={vi.fn()} />
      </QueryClientProvider>
    </I18nProvider>
  );
}

describe("BookingTunnel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Le composant calcule ses 7 jours à partir de `new Date()` : on fige la
    // date système (sans activer les fake timers, pour ne pas perturber
    // userEvent/waitFor) afin que le rendu et le snapshot soient stables
    // dans le temps, indépendamment du jour où les tests sont exécutés.
    vi.setSystemTime(new Date("2026-08-24T09:00:00Z"));

    getDisponibilites.mockResolvedValue({
      data: {
        disponibilites: [
          { id: 99, heureDebut: "09:00", heureFin: "09:30" },
        ],
      },
    });

    reserverCreneau.mockResolvedValue({
      data: { message: "Rendez-vous confirmé." },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rend le tunnel initial et produit un snapshot", () => {
    const { container } = renderBooking();

    expect(
      screen.getByText("Prendre rendez-vous")
    ).toBeInTheDocument();

    expect(screen.getByText("Date")).toBeInTheDocument();

    expect(container.firstChild).toMatchSnapshot();
  });

  it("réalise le parcours date → créneau → confirmation → succès", async () => {
    const user = userEvent.setup();

    renderBooking();

    const dateButtons = screen.getAllByRole("button");

    await user.click(
      dateButtons.find((button) => /\d{2}/.test(button.textContent))
    );

    await waitFor(() =>
      expect(getDisponibilites).toHaveBeenCalledWith(
        42,
        expect.any(String)
      )
    );

    await user.click(
      await screen.findByRole("button", { name: /09:00/ })
    );

    expect(
      screen.getByText("Confirmer le rendez-vous")
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Confirmer le rendez-vous",
      })
    );

    expect(
      await screen.findByText("Rendez-vous confirmé !")
    ).toBeInTheDocument();

    expect(reserverCreneau).toHaveBeenCalledWith(99);
  });
});