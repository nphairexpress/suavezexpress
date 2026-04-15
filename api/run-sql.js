export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { projectRef, pat, statements } = req.body;

  if (!projectRef || !pat || !statements || !Array.isArray(statements)) {
    return res.status(400).json({ error: "Missing projectRef, pat, or statements" });
  }

  const results = [];
  let ok = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < statements.length; i++) {
    try {
      const response = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${pat}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: statements[i] }),
        }
      );

      if (response.ok) {
        ok++;
      } else {
        const body = await response.text();
        if (body.includes("already exists") || body.includes("duplicate")) {
          skipped++;
        } else {
          errors++;
          results.push({ index: i, error: body.substring(0, 200) });
        }
      }
    } catch (err) {
      errors++;
      results.push({ index: i, error: err.message });
    }
  }

  return res.status(200).json({ ok, skipped, errors, details: results });
}
