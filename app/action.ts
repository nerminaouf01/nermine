export async function GET() {}
export async function getTechniciens(): Promise<any[]> {
  return [];
}

export type ActionResult =
  | { success: true; message?: string }
  | { success: false; message: string };

export async function supprimerDemandeTechnicien(_id: number): Promise<ActionResult> {
  return { success: true };
}


