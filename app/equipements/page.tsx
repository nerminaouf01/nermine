import prisma, { isDatabaseConfigured } from "../lib/prisma";
import { createEquipement } from "../actions/createEquipement";

export default async function EquipementsPage() {
  if (!isDatabaseConfigured()) {
    return (
      <main className="p-6 max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Équipements</h1>
        <p className="text-red-600">
          Configurez la variable d'environnement <code>DATABASE_URL</code> pour utiliser Prisma.
        </p>
      </main>
    );
  }

  const equipements = await prisma.equipement.findMany({ orderBy: { id: "desc" } });

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Équipements</h1>

      <form action={createEquipement} className="grid grid-cols-1 md:grid-cols-2 gap-3 border rounded p-4">
        <input name="code_imo" placeholder="Code IMO" className="border px-3 py-2 rounded" />
        <input name="nom_testeur" placeholder="Nom testeur" className="border px-3 py-2 rounded" />
        <input name="nom_equipement" placeholder="Nom équipement" className="border px-3 py-2 rounded" />
        <input name="designation" placeholder="Désignation" className="border px-3 py-2 rounded" />
        <input name="categorie" placeholder="Catégorie" className="border px-3 py-2 rounded" />
        <input type="number" name="nombre" placeholder="Nombre" className="border px-3 py-2 rounded" />
        <input type="date" name="date_mise_en_marche" placeholder="Date mise en marche" className="border px-3 py-2 rounded" />
        <input name="arborescence" placeholder="Arborescence" className="border px-3 py-2 rounded" />
        <input type="date" name="date_garantie" placeholder="Date garantie" className="border px-3 py-2 rounded" />
        <div className="md:col-span-2">
          <button type="submit" className="border px-4 py-2 rounded">Ajouter</button>
        </div>
      </form>

      <ul className="space-y-2">
        {equipements.map((e) => (
          <li key={e.id} className="border rounded p-3">
            <div className="font-medium">{e.nom_equipement} — {e.code_imo}</div>
            <div className="text-sm opacity-70">{e.designation}</div>
            <div className="text-sm">Catégorie: {e.categorie} • Nombre: {e.nombre}</div>
            {e.date_mise_en_marche && (
              <div className="text-xs opacity-60">Mise en marche: {new Date(e.date_mise_en_marche).toLocaleDateString()}</div>
            )}
            {e.date_garantie && (
              <div className="text-xs opacity-60">Garantie: {new Date(e.date_garantie).toLocaleDateString()}</div>
            )}
            {e.arborescence && (
              <div className="text-xs opacity-60">Arborescence: {e.arborescence}</div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}



