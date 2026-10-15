import { getStore } from "@netlify/blobs";

// Akun dicek di SERVER. Bisa diganti lewat Environment variables di Netlify.
const GATE_USER = process.env.GATE_USER || "FarNiBos";
const GATE_PASS = process.env.GATE_PASS || "LaVelaXfar";
const ADMIN_USER = process.env.ADMIN_USER || "far99";
const ADMIN_PASS = process.env.ADMIN_PASS || "farr67";
const MAX_BYTES = 4 * 1024 * 1024;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const b = await req.json().catch(() => ({}));
  if (b.gu !== GATE_USER || b.gp !== GATE_PASS) return json({ error: "auth" }, 401);

  const store = getStore("files");
  const adminOk = b.au === ADMIN_USER && b.ap === ADMIN_PASS;

  if (b.action === "list") {
    const { blobs } = await store.list();
    const files = [];
    for (const x of blobs) {
      const m = await store.getMetadata(x.key);
      if (m && m.metadata) files.push({ key: x.key, name: m.metadata.name, size: Number(m.metadata.size), date: Number(m.metadata.date) });
    }
    files.sort((p, q) => q.date - p.date);
    return json({ files });
  }

  if (b.action === "checkadmin") return adminOk ? json({ ok: true }) : json({ error: "admin" }, 403);

  if (b.action === "download") {
    const m = await store.getMetadata(String(b.key));
    const buf = await store.get(String(b.key), { type: "arrayBuffer" });
    if (!m || !buf) return json({ error: "notfound" }, 404);
    return json({ name: m.metadata.name, data: Buffer.from(buf).toString("base64") });
  }

  if (!adminOk) return json({ error: "admin" }, 403);

  if (b.action === "upload") {
    const bytes = Buffer.from(String(b.data || ""), "base64");
    if (!bytes.length || bytes.length > MAX_BYTES) return json({ error: "ukuran" }, 413);
    const key = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    await store.set(key, ab, {
      metadata: { name: String(b.name || "file").slice(0, 200), size: String(bytes.length), date: String(Date.now()) },
    });
    return json({ ok: true });
  }

  if (b.action === "delete") {
    await store.delete(String(b.key));
    return json({ ok: true });
  }

  return json({ error: "action" }, 400);
};

export const config = { path: "/api" };
    
