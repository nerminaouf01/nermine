export type Equipement = {
  id: number;
  code_imo: string;
  nom_testeur: string;
  nom_equipement: string;
  designation: string;
  date_mise_en_marche?: Date | null;
  arborescence?: string | null;
  date_garantie?: Date | null;
  categorie: string;
  nombre: number;
  disponible?: boolean;
  image?: string;
  isFavorite?: boolean;
};

export async function getEquipements(): Promise<Equipement[]> {
  try {
    const res = await fetch("/api/equipements", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data as Equipement[] : [];
  } catch {
    return [];
  }
}



