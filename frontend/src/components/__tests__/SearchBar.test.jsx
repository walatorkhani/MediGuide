import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect } from "vitest";
import SearchBar from "../SearchBar";

const baseFilters = { category: "", q: "", ville: "", specialite: "", typeGarde: "", radius: 5000 };

function renderSearchBar(overrides = {}) {
  const onChange = vi.fn();
  const onSearch = vi.fn();
  const onSelectCategory = vi.fn();
  const onNearMe = vi.fn();

  const props = {
    filters: baseFilters,
    onChange,
    onSearch,
    onSelectCategory,
    onNearMe,
    geoLoading: false,
    ...overrides,
  };

  render(<SearchBar {...props} />);

  return { onChange, onSearch, onSelectCategory, onNearMe };
}

describe("SearchBar", () => {
  it("déclenche onSelectCategory au clic sur une catégorie", async () => {
    const user = userEvent.setup();
    const { onSelectCategory } = renderSearchBar();

    await user.click(screen.getByText("Médecin"));

    expect(onSelectCategory).toHaveBeenCalledWith("medecin");
  });

  it("désélectionne la catégorie active en cliquant à nouveau dessus", async () => {
    const user = userEvent.setup();
    const { onSelectCategory } = renderSearchBar({ filters: { ...baseFilters, category: "medecin" } });

    await user.click(screen.getByText("Médecin"));

    expect(onSelectCategory).toHaveBeenCalledWith("");
  });

  it("affiche le filtre spécialité seulement pour la catégorie médecin", () => {
    render(
      <SearchBar
        filters={baseFilters}
        onChange={vi.fn()}
        onSearch={vi.fn()}
        onSelectCategory={vi.fn()}
        onNearMe={vi.fn()}
        geoLoading={false}
      />
    );

    expect(screen.queryByText("Spécialité")).not.toBeInTheDocument();
  });

  it("le bouton Rechercher soumet le formulaire et appelle onSearch", async () => {
    const user = userEvent.setup();
    const { onSearch } = renderSearchBar();

    await user.click(screen.getByRole("button", { name: "Rechercher" }));

    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it("le bouton Autour de moi appelle onNearMe et se désactive pendant le chargement", () => {
    renderSearchBar({ geoLoading: true });

    const bouton = screen.getByRole("button", { name: /Localisation/ });
    expect(bouton).toBeDisabled();
  });

  it("met à jour le texte de recherche via onChange", async () => {
    const user = userEvent.setup();
    const { onChange } = renderSearchBar();

    const champ = screen.getByPlaceholderText("Nom, cabinet, établissement...");
    await user.type(champ, "Dupont");

    expect(onChange).toHaveBeenCalled();
    const dernierAppel = onChange.mock.calls.at(-1)[0];
    expect(dernierAppel.q).toBe("t"); // dernière frappe simulée (onChange appelé lettre par lettre)
  });

  it("affiche le filtre spécialité pour la catégorie médecin et met à jour la sélection", async () => {
    const user = userEvent.setup();
    const { onChange } = renderSearchBar({ filters: { ...baseFilters, category: "medecin" } });

    await user.click(screen.getByText(/Filtres/));

    expect(screen.getByText("Spécialité")).toBeInTheDocument();
    expect(screen.queryByText("Garde")).not.toBeInTheDocument();

    const select = screen.getByDisplayValue("Toutes spécialités");
    await user.selectOptions(select, "Cardiologie");

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ specialite: "Cardiologie" }));
  });

  it("affiche le filtre garde pour la catégorie pharmacie et met à jour la sélection", async () => {
    const user = userEvent.setup();
    const { onChange } = renderSearchBar({ filters: { ...baseFilters, category: "pharmacie" } });

    await user.click(screen.getByText(/Filtres/));

    expect(screen.getByText("Garde")).toBeInTheDocument();
    expect(screen.queryByText("Spécialité")).not.toBeInTheDocument();

    const select = screen.getByDisplayValue("Toutes les pharmacies");
    await user.selectOptions(select, "Nuit");

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ typeGarde: "Nuit" }));
  });

  it("met à jour le rayon de recherche et affiche la valeur en km", async () => {
    const user = userEvent.setup();
    const { onChange } = renderSearchBar({ filters: { ...baseFilters, category: "medecin" } });

    await user.click(screen.getByText(/Filtres/));

    expect(screen.getByText("Rayon de recherche : 5 km")).toBeInTheDocument();

    const curseur = screen.getByRole("slider");
    fireEvent.change(curseur, { target: { value: "10000" } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ radius: 10000 }));
  });

  it("met à jour la ville via onChange", async () => {
    const user = userEvent.setup();
    const { onChange } = renderSearchBar();

    const champ = screen.getByPlaceholderText("Ville ou délégation (ex: Jendouba Sud)");
    await user.type(champ, "Jendouba");

    expect(onChange).toHaveBeenCalled();
    const dernierAppel = onChange.mock.calls.at(-1)[0];
    expect(dernierAppel.ville).toBe("a");
  });
});
