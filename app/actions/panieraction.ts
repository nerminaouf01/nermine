"use server";

type PanierItem = { id: number; quantity: number };

export type ValiderPanierResult =
  | { success: true; updatedItems?: { id: number; nombre: number }[] }
  | { success: false; error: string };

export async function validerPanier(_items: PanierItem[]): Promise<ValiderPanierResult> {
  return { success: true, updatedItems: [] };
}


