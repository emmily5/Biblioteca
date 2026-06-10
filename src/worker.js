const IMAGE_ROUTE = "/api/images/";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.pathname.startsWith("/api/")) {
        return await handleApi(request, env, url);
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);
      return json({ error: "Erro interno do servidor" }, 500);
    }
  },
};

async function handleApi(request, env, url) {
  const { pathname } = url;

  if (pathname === "/api/categories") {
    if (request.method === "GET") return listCategories(env);
    if (request.method === "POST") return createCategory(request, env);
  }

  if (pathname.startsWith("/api/categories/")) {
    const id = decodeURIComponent(pathname.slice("/api/categories/".length));
    if (request.method === "PUT") return updateCategory(request, env, id);
    if (request.method === "DELETE") return deleteCategory(env, id);
  }

  if (pathname === "/api/components") {
    if (request.method === "GET") return listComponents(env, url);
    if (request.method === "POST") return createComponent(request, env);
  }

  if (pathname.startsWith("/api/components/")) {
    const id = decodeURIComponent(pathname.slice("/api/components/".length));
    if (request.method === "PUT") return updateComponent(request, env, id);
    if (request.method === "DELETE") return deleteComponent(env, id);
  }

  if (pathname === "/api/images" && request.method === "POST") {
    return uploadImage(request, env);
  }

  if (pathname.startsWith(IMAGE_ROUTE) && request.method === "GET") {
    return getImage(env, decodeURIComponent(pathname.slice(IMAGE_ROUTE.length)));
  }

  return json({ error: "Rota nao encontrada" }, 404);
}

async function listCategories(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, name, emoji, bg, color FROM categories ORDER BY created_at ASC"
  ).all();
  return json(results);
}

async function createCategory(request, env) {
  const body = await readJson(request);
  if (!body.name) return json({ error: "name e obrigatorio" }, 400);

  const now = Date.now();
  const category = {
    id: uid(),
    name: body.name,
    emoji: body.emoji || "",
    bg: body.bg || "",
    color: body.color || "",
  };

  await env.DB.prepare(
    "INSERT INTO categories (id, name, emoji, bg, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(category.id, category.name, category.emoji, category.bg, category.color, now, now)
    .run();

  return json(category, 201);
}

async function updateCategory(request, env, id) {
  const existing = await getCategory(env, id);
  if (!existing) return json({ error: "categoria nao encontrada" }, 404);

  const body = await readJson(request);
  const next = {
    name: body.name !== undefined ? body.name : existing.name,
    emoji: body.emoji !== undefined ? body.emoji : existing.emoji,
    bg: body.bg !== undefined ? body.bg : existing.bg,
    color: body.color !== undefined ? body.color : existing.color,
  };

  await env.DB.prepare(
    "UPDATE categories SET name = ?, emoji = ?, bg = ?, color = ?, updated_at = ? WHERE id = ?"
  )
    .bind(next.name, next.emoji, next.bg, next.color, Date.now(), id)
    .run();

  return json({ id, ...next });
}

async function deleteCategory(env, id) {
  const existing = await getCategory(env, id);
  if (!existing) return json({ error: "categoria nao encontrada" }, 404);

  const { results } = await env.DB.prepare(
    "SELECT image_key FROM components WHERE cat_id = ? AND image_key IS NOT NULL"
  )
    .bind(id)
    .all();

  await env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
  await deleteImages(env, results.map((row) => row.image_key));

  return json({ ok: true });
}

async function listComponents(env, url) {
  const catId = url.searchParams.get("catId");
  const stmt = catId
    ? env.DB.prepare("SELECT * FROM components WHERE cat_id = ? ORDER BY created_at DESC").bind(catId)
    : env.DB.prepare("SELECT * FROM components ORDER BY created_at DESC");
  const { results } = await stmt.all();
  return json(results.map(componentFromRow));
}

async function createComponent(request, env) {
  const body = await readJson(request);
  if (!body.catId) return json({ error: "catId e obrigatorio" }, 400);
  if (!body.name) return json({ error: "name e obrigatorio" }, 400);

  const now = Date.now();
  const imageKey = imageKeyFromUrl(body.img || body.imageKey || null);
  const component = {
    id: uid(),
    catId: body.catId,
    name: body.name,
    desc: body.desc || "",
    html: body.html || "",
    css: body.css || "",
    js: body.js || "",
    imageKey,
    imageContentType: imageKey ? "image/webp" : null,
    imageSize: null,
    createdAt: now,
  };

  try {
    await env.DB.prepare(
      `INSERT INTO components
        (id, cat_id, name, "desc", html, css, js, image_key, image_content_type, image_size, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        component.id,
        component.catId,
        component.name,
        component.desc,
        component.html,
        component.css,
        component.js,
        component.imageKey,
        component.imageContentType,
        component.imageSize,
        now,
        now
      )
      .run();
  } catch (error) {
    if (String(error.message || error).includes("FOREIGN KEY")) {
      return json({ error: "categoria nao encontrada" }, 400);
    }
    throw error;
  }

  return json(componentToResponse(component), 201);
}

async function updateComponent(request, env, id) {
  const existing = await getComponent(env, id);
  if (!existing) return json({ error: "componente nao encontrado" }, 404);

  const body = await readJson(request);
  const hasImageUpdate = body.img !== undefined || body.imageKey !== undefined;
  const imageKey = hasImageUpdate ? imageKeyFromUrl(body.img || body.imageKey || null) : existing.image_key;

  const next = {
    catId: body.catId !== undefined ? body.catId : existing.cat_id,
    name: body.name !== undefined ? body.name : existing.name,
    desc: body.desc !== undefined ? body.desc : existing.desc,
    html: body.html !== undefined ? body.html : existing.html,
    css: body.css !== undefined ? body.css : existing.css,
    js: body.js !== undefined ? body.js : existing.js,
    imageKey,
    imageContentType: imageKey ? "image/webp" : null,
    imageSize: existing.image_size,
  };

  try {
    await env.DB.prepare(
      `UPDATE components
       SET cat_id = ?, name = ?, "desc" = ?, html = ?, css = ?, js = ?,
           image_key = ?, image_content_type = ?, image_size = ?, updated_at = ?
       WHERE id = ?`
    )
      .bind(
        next.catId,
        next.name,
        next.desc,
        next.html,
        next.css,
        next.js,
        next.imageKey,
        next.imageContentType,
        next.imageSize,
        Date.now(),
        id
      )
      .run();
  } catch (error) {
    if (String(error.message || error).includes("FOREIGN KEY")) {
      return json({ error: "categoria nao encontrada" }, 400);
    }
    throw error;
  }

  if (hasImageUpdate && existing.image_key && existing.image_key !== imageKey) {
    await deleteImages(env, [existing.image_key]);
  }

  return json(componentToResponse({ id, ...next, createdAt: existing.created_at }));
}

async function deleteComponent(env, id) {
  const existing = await getComponent(env, id);
  if (!existing) return json({ error: "componente nao encontrado" }, 404);

  await env.DB.prepare("DELETE FROM components WHERE id = ?").bind(id).run();
  await deleteImages(env, [existing.image_key]);

  return json({ ok: true });
}

async function uploadImage(request, env) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return json({ error: "Envie multipart/form-data com o campo file" }, 400);
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!file || typeof file.arrayBuffer !== "function") {
    return json({ error: "Arquivo de imagem nao enviado" }, 400);
  }

  if (file.type !== "image/webp") {
    return json({ error: "A imagem deve ser enviada em WebP" }, 415);
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return json({ error: "Imagem maior que 10 MB" }, 413);
  }

  const key = `screenshots/${new Date().toISOString().slice(0, 10)}/${uid()}.webp`;
  await env.IMAGES.put(key, file.stream(), {
    httpMetadata: {
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
    },
    customMetadata: {
      originalName: file.name || "",
    },
  });

  return json({ key, url: `${IMAGE_ROUTE}${key}` }, 201);
}

async function getImage(env, key) {
  if (!key) return json({ error: "Imagem nao encontrada" }, 404);

  const object = await env.IMAGES.get(key);
  if (!object) return json({ error: "Imagem nao encontrada" }, 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  if (!headers.has("content-type")) headers.set("content-type", "image/webp");
  if (!headers.has("cache-control")) headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
}

async function getCategory(env, id) {
  return env.DB.prepare("SELECT id, name, emoji, bg, color FROM categories WHERE id = ?")
    .bind(id)
    .first();
}

async function getComponent(env, id) {
  return env.DB.prepare("SELECT * FROM components WHERE id = ?").bind(id).first();
}

async function readJson(request) {
  try {
    return await request.json();
  } catch (error) {
    return {};
  }
}

async function deleteImages(env, keys) {
  const uniqueKeys = [...new Set(keys.filter(Boolean))];
  if (uniqueKeys.length) await env.IMAGES.delete(uniqueKeys);
}

function componentFromRow(row) {
  return {
    id: row.id,
    catId: row.cat_id,
    name: row.name,
    desc: row.desc || "",
    html: row.html || "",
    css: row.css || "",
    js: row.js || "",
    img: row.image_key ? `${IMAGE_ROUTE}${row.image_key}` : null,
    imageKey: row.image_key || null,
    createdAt: row.created_at,
  };
}

function componentToResponse(component) {
  return {
    id: component.id,
    catId: component.catId,
    name: component.name,
    desc: component.desc || "",
    html: component.html || "",
    css: component.css || "",
    js: component.js || "",
    img: component.imageKey ? `${IMAGE_ROUTE}${component.imageKey}` : null,
    imageKey: component.imageKey || null,
    createdAt: component.createdAt,
  };
}

function imageKeyFromUrl(value) {
  if (!value) return null;
  if (value.startsWith(IMAGE_ROUTE)) return decodeURIComponent(value.slice(IMAGE_ROUTE.length));
  return value;
}

function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
