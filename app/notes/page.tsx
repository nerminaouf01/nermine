import prisma, { isDatabaseConfigured } from "../lib/prisma";
import { createNote } from "../actions/createNote";

export default async function NotesPage() {
  if (!isDatabaseConfigured()) {
    return (
      <main className="p-6 max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Notes</h1>
        <p className="text-red-600">
          Configurez la variable d'environnement <code>DATABASE_URL</code> pour utiliser Prisma.
        </p>
      </main>
    );
  }

  const notes = await prisma.note.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <main className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Notes</h1>

      <form action={createNote} className="flex gap-2">
        <input
          type="text"
          name="content"
          placeholder="Écrivez une note..."
          className="flex-1 border px-3 py-2 rounded"
        />
        <button type="submit" className="border px-4 py-2 rounded">
          Ajouter
        </button>
      </form>

      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="border rounded p-3">
            <div className="text-sm opacity-60">
              {new Date(n.createdAt).toLocaleString()}
            </div>
            <div>{n.content}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}


