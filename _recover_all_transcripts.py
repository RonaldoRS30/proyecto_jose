import json
from pathlib import Path

transcript_root = Path(r"C:\Users\Ronaldo\.cursor\projects\c-proyecto-jose\agent-transcripts")
out_dir = Path(r"c:\proyecto_jose\_recovered")
out_dir.mkdir(exist_ok=True)

targets = {
    "frontend/src/services/api.js": [],
    "frontend/src/pages/auth/LoginPage.jsx": [],
    "backend/services/clienteService.js": [],
    "backend/services/codigoLoginService.js": [],
    "backend/helpers/codigoHelper.js": [],
    "backend/services/configuracionService.js": [],
    "backend/routes/recomendacionRoutes.js": [],
}

def match_target(path: str):
    p = path.replace("\\", "/").lower()
    for t in targets:
        if t.lower() in p or p.endswith(t.split("/")[-1].lower()):
            return t
    return None


def walk(obj, transcript, line_no):
    if isinstance(obj, dict):
        if obj.get("type") == "tool_use":
            name = obj.get("name")
            inp = obj.get("input", {})
            path = inp.get("path", "")
            t = match_target(path)
            if t:
                entry = {
                    "transcript": str(transcript),
                    "line": line_no,
                    "tool": name,
                    "path": path,
                }
                if name == "Write":
                    entry["content"] = inp.get("contents", "")
                    entry["score"] = len(entry["content"])
                elif name == "StrReplace":
                    entry["old"] = inp.get("old_string", "")
                    entry["new"] = inp.get("new_string", "")
                    entry["score"] = max(len(entry["old"]), len(entry["new"]))
                else:
                    entry["score"] = 0
                targets[t].append(entry)
        for v in obj.values():
            walk(v, transcript, line_no)
    elif isinstance(obj, list):
        for v in obj:
            walk(v, transcript, line_no)

for fp in transcript_root.rglob("*.jsonl"):
    with open(fp, "r", encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            walk(obj, fp, i)

for t, entries in targets.items():
    safe = t.replace("/", "__")
    report = out_dir / f"{safe}_report.txt"
    lines = [f"TARGET: {t}", f"ENTRIES: {len(entries)}", ""]
    writes = [e for e in entries if e["tool"] == "Write"]
    if writes:
        best = max(writes, key=lambda e: e["score"])
        lines.append(f"BEST WRITE: {best['transcript']} line {best['line']} len={best['score']}")
        lines.append("")
        lines.append("=== FULL WRITE CONTENT ===")
        lines.append(best["content"])
        (out_dir / f"{safe}_best_write.txt").write_text(best["content"], encoding="utf-8")
    else:
        lines.append("NO WRITE FOUND")
        # collect all strreplaces
        for e in sorted(entries, key=lambda x: (x["line"])):
            if e["tool"] == "StrReplace":
                lines.append(f"\n--- STRREPLACE {e['transcript']}:{e['line']} ---")
                lines.append("OLD:")
                lines.append(e["old"])
                lines.append("NEW:")
                lines.append(e["new"])
    report.write_text("\n".join(lines), encoding="utf-8")
    print(t, "writes=", len(writes), "total=", len(entries))
