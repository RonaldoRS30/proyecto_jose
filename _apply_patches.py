import json
from pathlib import Path

transcript_root = Path(r"C:\Users\Ronaldo\.cursor\projects\c-proyecto-jose\agent-transcripts")
recovered = Path(r"c:\proyecto_jose\_recovered")

targets = {
    "frontend/src/services/api.js": recovered / "frontend__src__services__api.js_best_write.txt",
    "frontend/src/pages/auth/LoginPage.jsx": recovered / "frontend__src__pages__auth__LoginPage.jsx_best_write.txt",
    "backend/services/clienteService.js": recovered / "backend__services__clienteService.js_best_write.txt",
    "backend/services/codigoLoginService.js": recovered / "backend__services__codigoLoginService.js_best_write.txt",
    "backend/helpers/codigoHelper.js": recovered / "backend__helpers__codigoHelper.js_best_write.txt",
    "backend/services/configuracionService.js": recovered / "backend__services__configuracionService.js_best_write.txt",
    "backend/routes/recomendacionRoutes.js": recovered / "backend__routes__recomendacionRoutes.js_best_write.txt",
}

patches = {k: [] for k in targets}


def match_target(path: str):
    p = path.replace("\\", "/").lower()
    for t in targets:
        if t.lower() in p:
            return t
    return None


for fp in sorted(transcript_root.rglob("*.jsonl")):
    with open(fp, "r", encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue

            def walk(node):
                if isinstance(node, dict):
                    if node.get("type") == "tool_use" and node.get("name") == "StrReplace":
                        inp = node.get("input", {})
                        t = match_target(inp.get("path", ""))
                        if t:
                            patches[t].append(
                                {
                                    "file": str(fp),
                                    "line": i,
                                    "old": inp.get("old_string", ""),
                                    "new": inp.get("new_string", ""),
                                }
                            )
                    for v in node.values():
                        walk(v)
                elif isinstance(node, list):
                    for v in node:
                        walk(v)

            walk(obj)

final_dir = Path(r"c:\proyecto_jose\_recovered_final")
final_dir.mkdir(exist_ok=True)

for t, base_path in targets.items():
    content = base_path.read_text(encoding="utf-8")
    applied = 0
    skipped = 0
    log = [f"# {t}", f"Base: {base_path.name}", ""]
    for p in patches[t]:
        if p["old"] in content:
            content = content.replace(p["old"], p["new"], 1)
            applied += 1
            log.append(f"APPLIED {p['file']}:{p['line']}")
        else:
            skipped += 1
            log.append(f"SKIPPED {p['file']}:{p['line']} (old_string not found)")
    out = final_dir / t.replace("/", "__")
    out.write_text(content, encoding="utf-8")
    log.append("")
    log.append(f"Applied {applied}, skipped {skipped}, final len {len(content)}")
    (final_dir / f"{t.replace('/', '__')}_patch.log").write_text("\n".join(log), encoding="utf-8")
    print(t, applied, skipped, len(content))
