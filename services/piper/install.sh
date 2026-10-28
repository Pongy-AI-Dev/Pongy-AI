#!/bin/sh
set -eu
# Run from the repository root; the model/venv are operator-managed data, not source.
python3 -m venv data/piper-venv
data/piper-venv/bin/pip install -r services/piper/requirements.txt
mkdir -p data/piper-model
data/piper-venv/bin/python -m piper.download_voices --download-dir data/piper-model ru_RU-denis-medium
data/piper-venv/bin/python - <<'PYVERIFY'
import hashlib
from pathlib import Path
expected = {'ru_RU-denis-medium.onnx':'15fab56e11a097858ee115545d0f697fc2a316c41a291a5362349fb870411b0a','ru_RU-denis-medium.onnx.json':'831c860dac0b5073eaa81610a0a638ec23d90a6cf8e5f871b4485c2cec3767c8'}
for name, checksum in expected.items():
    actual = hashlib.sha256(Path('data/piper-model', name).read_bytes()).hexdigest()
    if actual != checksum: raise SystemExit('Model checksum mismatch: ' + name)
PYVERIFY
printf '\nSet absolute paths in the server environment:\nPIPER_PYTHON=%s/data/piper-venv/bin/python\nPIPER_MODEL=%s/data/piper-model/ru_RU-denis-medium.onnx\n' "$PWD" "$PWD"
