import json
from pathlib import Path

transcript = Path(r"C:\Users\Ronaldo\.cursor\projects\c-proyecto-jose\agent-transcripts\c047038e-12b8-45aa-9fc0-1e777d9e84a0\c047038e-12b8-45aa-9fc0-1e777d9e84a0.jsonl")
subagent = Path(r"C:\Users\Ronaldo\.cursor\projects\c-proyecto-jose\agent-transcripts\c047038e-12b8-45aa-9fc0-1e777d9e84a0\subagents\02162fc5-3d30-4906-a48a-7041df22e7bf.jsonl")

targets = [
    "api.js", "LoginPage.jsx", "clienteService.js", "codigoLoginService.js",
    "codigoHelper.js", "configuracionService.js", "recomendacionRoutes.js",
]

def dump_file(fp, out_prefix):
    with open(fp, "r", encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            obj = json.loads(line)
            content = obj.get("message", {}).get("content", [])
            if not isinstance(content, list):
                continue
            for j, item in enumerate(content):
                if item.get("type") != "tool_use":
                    continue
                path = item.get("input", {}).get("path", "")
                if not any(t in path.replace("\\", "/") for t in targets):
                    continue
                name = item.get("name")
                inp = item.get("input", {})
                out = Path(f"c:\\proyecto_jose\\_line_{out_prefix}_{i}_{j}_{name}.txt")
                parts = [f"LINE {i} TOOL {name}", f"PATH: {path}", ""]
                if name == "Write":
                    parts.append(inp.get("contents", ""))
                elif name == "StrReplace":
                    parts.append("=== OLD ===")
                    parts.append(inp.get("old_string", ""))
                    parts.append("=== NEW ===")
                    parts.append(inp.get("new_string", ""))
                else:
                    parts.append(str(inp))
                out.write_text("\n".join(parts), encoding="utf-8")
                print(out.name, out.stat().st_size)

dump_file(transcript, "main")
dump_file(subagent, "sub")
