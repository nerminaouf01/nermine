import type { Equipement } from "./affiche_equip/action";

export type UpdateItem = { id: number; quantity: number };
export type UpdateResult =
  | { success: true; updatedItems?: { id: number; nombre: number }[] }
  | { success: false; error: string };

export async function updateEquipmentStock(
  _items: UpdateItem[]
): Promise<UpdateResult> {
  return { success: true, updatedItems: [] };
}

export async function getUpdatedEquipments(_ids: number[]): Promise<Equipement[]> {
  return [];
}


