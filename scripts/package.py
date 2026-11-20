"""Validate and package the module using only Python's standard library."""

import hashlib
import json
import os
from pathlib import Path
import re
import zipfile

root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / "module.json").read_text(encoding="utf-8"))
version = manifest["version"]
if not re.fullmatch(r"\d+\.\d+\.\d+", version):
    raise SystemExit("module.json must have a stable x.y.z version")
tag = f"v{version}"
if (os.environ.get("RELEASE_TAG") or tag) != tag:
    raise SystemExit("Release tag must match the version in module.json")

repository = os.environ.get("GITHUB_REPOSITORY", "IgorFmatheus/everest-companion-foundry")
base = f"https://github.com/{repository}"
expected = {
    "id": "everest-companion",
    "url": base,
    "manifest": f"{base}/releases/latest/download/module.json",
    "download": f"{base}/releases/download/{tag}/everest-companion.zip",
}
for key, value in expected.items():
    if manifest.get(key) != value:
        raise SystemExit(f"Incorrect {key} in module.json; expected {value}")

files = ["module.json", "README.md", *manifest["esmodules"], *manifest["styles"]]
for name in files:
    path = root / name
    if not path.resolve().is_relative_to(root) or not path.is_file():
        raise SystemExit(f"Missing or unsafe module file: {name}")

dist = root / "dist"
dist.mkdir(exist_ok=True)
payload = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
(dist / "module.json").write_bytes(payload)
archive_path = dist / "everest-companion.zip"
with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED) as archive:
    for name in files:
        archive.writestr(name, payload if name == "module.json" else (root / name).read_bytes())

with zipfile.ZipFile(archive_path) as archive:
    assert archive.testzip() is None, "Invalid ZIP checksum"
    assert set(archive.namelist()) == set(files), "Unexpected ZIP contents"
    assert archive.read("module.json") == payload, "Manifest mismatch"

checksums = "".join(
    f"{hashlib.sha256((dist / name).read_bytes()).hexdigest()}  {name}\n"
    for name in ["module.json", "everest-companion.zip"]
)
(dist / "SHA256SUMS.txt").write_text(checksums, encoding="utf-8")
print(f"Validated {tag}: module.json, everest-companion.zip and SHA256SUMS.txt")
