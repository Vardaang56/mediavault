import { getStore } from "@netlify/blobs";
import { randomUUID, timingSafeEqual } from "node:crypto";

const STORE = "mediavault-media";
const MAX_BYTES = 4.5 * 1024 * 1024;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}
function authorized(request) {
  const expected = process.env.ADMIN_PASSWORD || "";
  const supplied = request.headers.get("x-admin-password") || "";
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}
function requireAdmin(request) {
  if (!authorized(request)) return json({ error: "Incorrect admin password." }, 401);
  return null;
}
function safeName(name) {
  return String(name || "Untitled").replace(/[\\/\x00-\x1f]/g, "_").slice(0, 180);
}

export default async (request) => {
  try {
    const store = getStore({ name: STORE, consistency: "strong" });
    const url = new URL(request.url);

    if (request.method === "GET" && url.searchParams.has("file")) {
      const id = url.searchParams.get("file") || "";
      if (!/^[a-f0-9-]{36}$/i.test(id)) return json({ error: "File not found." }, 404);
      const item = await store.getWithMetadata(id, { type: "blob", consistency: "strong" });
      if (!item) return json({ error: "File not found." }, 404);
      const meta = item.metadata || {};
      return new Response(item.data, {
        headers: {
          "content-type": meta.contentType || "application/octet-stream",
          "content-disposition": "inline; filename*=UTF-8''" + encodeURIComponent(meta.fileName || "media"),
          "cache-control": "public, max-age=300",
          "x-content-type-options": "nosniff"
        }
      });
    }

    if (request.method === "GET") {
      const { blobs } = await store.list();
      const items = [];
      for (const blob of blobs) {
        const meta = await store.getMetadata(blob.key, { consistency: "strong" });
        if (!meta) continue;
        items.push({
          id: blob.key,
          name: meta.metadata?.name || "Untitled",
          fileName: meta.metadata?.fileName || "media",
          category: meta.metadata?.category || "sounds",
          size: meta.metadata?.size || 0
        });
      }
      items.sort((a, b) => a.name.localeCompare(b.name));
      return json({ items });
    }

    if (request.method === "POST") {
      const denied = requireAdmin(request);
      if (denied) return denied;

      if (request.headers.get("content-type")?.includes("application/json")) {
        const body = await request.json();
        if (body.action === "auth") return json({ ok: true });
        return json({ error: "Unsupported action." }, 400);
      }

      const form = await request.formData();
      const file = form.get("file");
      const category = form.get("category");
      if (!(file instanceof File)) return json({ error: "Choose a file to upload." }, 400);
      if (!["sounds", "music", "broll"].includes(category)) return json({ error: "Invalid media category." }, 400);
      const isVideo = file.type.startsWith("video/");
      const isAudio = file.type.startsWith("audio/");
      if ((category === "broll" && !isVideo) || (category !== "broll" && !isAudio)) {
        return json({ error: "Choose a video for B-roll or an audio file for the audio categories." }, 400);
      }
      if (!file.size || file.size > MAX_BYTES) return json({ error: "Files must be between 1 byte and 4.5 MB. Larger files need a different upload setup." }, 413);

      const id = randomUUID();
      const fileName = safeName(file.name);
      const name = fileName.replace(/\.[^.]+$/, "");
      await store.set(id, file, {
        metadata: { name, fileName, category, contentType: file.type, size: file.size }
      });
      return json({ ok: true, id, name });
    }

    if (request.method === "DELETE") {
      const denied = requireAdmin(request);
      if (denied) return denied;
      const id = url.searchParams.get("id") || "";
      if (!/^[a-f0-9-]{36}$/i.test(id)) return json({ error: "Invalid file ID." }, 400);
      await store.delete(id);
      return json({ ok: true });
    }

    return json({ error: "Method not allowed." }, 405);
  } catch (error) {
    console.error("MediaVault function error:", error);
    return json({ error: "Server error. Check the Netlify function logs." }, 500);
  }
};