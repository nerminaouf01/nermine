"use server";

import prisma from "../lib/prisma";

export async function createEquipement(formData: FormData) {
  const code_imo = String(formData.get("code_imo") ?? "").trim();
  const nom_testeur = String(formData.get("nom_testeur") ?? "").trim();
  const nom_equipement = String(formData.get("nom_equipement") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim();
  const date_mise_en_marche_raw = String(
    formData.get("date_mise_en_marche") ?? ""
  ).trim();
  const arborescence = String(formData.get("arborescence") ?? "").trim();
  const date_garantie_raw = String(formData.get("date_garantie") ?? "").trim();
  const categorie = String(formData.get("categorie") ?? "").trim();
  const nombre_raw = String(formData.get("nombre") ?? "").trim();

  if (!code_imo || !nom_testeur || !nom_equipement || !designation || !categorie) {
    return { ok: false, error: "Champs requis manquants." };
  }

  const nombre = Number(nombre_raw || "0");
  if (!Number.isFinite(nombre) || nombre < 0) {
    return { ok: false, error: "Nombre invalide." };
  }

  const date_mise_en_marche = date_mise_en_marche_raw
    ? new Date(date_mise_en_marche_raw)
    : null;
  const date_garantie = date_garantie_raw ? new Date(date_garantie_raw) : null;

  try {
    const equipement = await prisma.equipement.create({
      data: {
        code_imo,
        nom_testeur,
        nom_equipement,
        designation,
        date_mise_en_marche: date_mise_en_marche ?? undefined,
        arborescence: arborescence || undefined,
        date_garantie: date_garantie ?? undefined,
        categorie,
        nombre,
      },
    });
    return { ok: true, equipement };
  } catch (error: unknown) {
    console.error("Erreur Prisma create Equipement:", error);
    return { ok: false, error: "Impossible de créer l'équipement." };
  }
}



