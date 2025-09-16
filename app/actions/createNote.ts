"use server";

import prisma from "../lib/prisma";

export async function createNote(formData: FormData) {
  const content = String(formData.get("content") ?? "").trim();
  if (!content) {
    return { ok: false, error: "Le contenu est requis." };
  }

  try {
    const note = await prisma.note.create({ data: { content } });
    return { ok: true, note };
  } catch (error) {
    console.error("Erreur Prisma create:", error);
    return { ok: false, error: "Impossible de créer la note." };
  }
}



