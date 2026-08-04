import json
from pathlib import Path

transcript_dir = Path(r"C:\Users\Ronaldo\.cursor\projects\c-proyecto-jose\agent-transcripts\c047038e-12b8-45aa-9fc0-1e777d9e84a0")

targets = [
    "frontend/src/services/api.js",
    "frontend/src/pages/auth/LoginPage.jsx",
    "backend/services/clienteService.js",
    "backend/services/codigoLoginService.js",
    "backend/helpers/codigoHelper.js",
    "backend/services/configuracionService.js",
    "backend/routes/recomendacionRoutes.js",
]

OUT = Path(r"c:\proyecto_jose\_transcript_extract.txt")


def norm(p: str) -> str:
    return p.replace("\\", "/").lower()


events = {t: [] for t in targets}

for fp in transcript_dir.rglob("*.jsonl"):
    with open(fp, "r", encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            content = obj.get("message", {}).get("content", [])
            if not isinstance(content, list):
                continue
            for item in content:
                if item.get("type") != "tool_use":
                    continue
                name = item.get("name")
                inp = item.get("input", {})
                path = inp.get("path", "")
                np = norm(path)
                matched = next((t for t in targets if t.lower() in np), None)
                if not matched:
                    continue
                rec = {"file": str(fp), "line": i, "tool": name, "path": path}
                if name == "Write":
                    rec["kind"] = "write"
                    rec["content"] = inp.get("contents", "")
                elif name == "StrReplace":
                    rec["kind"] = "strreplace"
                    rec["old"] = inp.get("old_string", "")
                    rec["new"] = inp.get("new_string", "")
                elif name == "Read":
                    rec["kind"] = "read_request"
                else:
                    rec["kind"] = name.lower()
                events[matched].append(rec)

lines = []
for t in targets:
    lines.append("=" * 80)
    lines.append(f"TARGET: {t}")
    lines.append(f"EVENTS: {len(events[t])}")
    for e in events[t]:
        if e["kind"] == "write":
            lines.append(f"--- WRITE {e['file']}:{e['line']} len={len(e['content'])} ---")
            lines.append(e["content"])
        elif e["kind"] == "strreplace":
            lines.append(
                f"--- STRREPLACE {e['file']}:{e['line']} old={len(e['old'])} new={len(e['new'])} ---"
            )
            lines.append("=== OLD ===")
            lines.append(e["old"])
            lines.append("=== NEW ===")
            lines.append(e["new"])
        else:
            lines.append(f"--- {e['kind'].upper()} {e['file']}:{e['line']} ---")

OUT.write_text("\n".join(lines), encoding="utf-8")
print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")
