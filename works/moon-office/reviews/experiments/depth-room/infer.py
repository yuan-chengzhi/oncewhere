"""Research probe: lift the office illustration into visible-surface geometry.

No hidden surfaces, separate objects, collision or character rig are invented.
Run with a MoGe v2 compatible environment and pass its repository directory.
"""
from pathlib import Path
import argparse
import hashlib
import json
import sys
import time

parser = argparse.ArgumentParser()
parser.add_argument('--moge-repo', required=True)
parser.add_argument('--model-revision', default='26b477f41595707c5db6770294c0d1721e8ed4ed')
args = parser.parse_args()
sys.path.insert(0, args.moge_repo)

import numpy as np
from PIL import Image
import torch
import trimesh
from moge.model.v2 import MoGeModel

root = Path(__file__).resolve().parent
work = root.parents[2]
source = work / 'assets/art-source/office.png'
torch.set_num_threads(8)
model_name = 'Ruicheng/moge-2-vits-normal'
revision = args.model_revision
print('Loading:', model_name, revision, flush=True)
model = MoGeModel.from_pretrained(model_name, revision=revision).to('cpu').eval()
image = Image.open(source).convert('RGB')
image.thumbnail((800, 800))
pixels = np.array(image)
tensor = torch.from_numpy(pixels).permute(2, 0, 1).float() / 255
started = time.perf_counter()
with torch.inference_mode():
    prediction = model.infer(tensor, resolution_level=3, use_fp16=False)
elapsed = time.perf_counter() - started
points = prediction['points'].numpy()
depth = prediction['depth'].numpy()
mask = prediction['mask'].numpy()
intrinsics = prediction['intrinsics'].numpy()
np.savez_compressed(root / 'prediction.npz', points=points, depth=depth, mask=mask, intrinsics=intrinsics)

# A regular mesh of the visible surface, with triangles across strong depth
# discontinuities removed. This deliberately exposes missing hidden surfaces.
step = 3
ys = np.arange(0, pixels.shape[0], step)
xs = np.arange(0, pixels.shape[1], step)
grid = points[np.ix_(ys, xs)].copy()
valid = mask[np.ix_(ys, xs)] & np.isfinite(grid).all(axis=-1)
h, w = valid.shape
vertices = grid.reshape(-1, 3)
vertices[~np.isfinite(vertices)] = 0
faces = []
faces_connected = []
for y in range(h - 1):
    for x in range(w - 1):
        a = y * w + x
        for face in ((a, a + w, a + 1), (a + 1, a + w, a + w + 1)):
            if not valid.reshape(-1)[list(face)].all():
                continue
            faces_connected.append(face)
            z = vertices[list(face), 2]
            if z.max() - z.min() > max(0.035 * float(z.min()), 0.035):
                continue
            faces.append(face)
vertices *= np.array([1, -1, -1], dtype=np.float32)
xx, yy = np.meshgrid(xs / (pixels.shape[1] - 1), 1 - ys / (pixels.shape[0] - 1))
uv = np.stack((xx, yy), axis=-1).reshape(-1, 2)
material = trimesh.visual.material.PBRMaterial(baseColorTexture=image, metallicFactor=0, roughnessFactor=1, doubleSided=True)
visual = trimesh.visual.texture.TextureVisuals(uv=uv, material=material)
mesh = trimesh.Trimesh(vertices=vertices, faces=np.array(faces), visual=visual, process=False)
mesh.export(root / 'office-surface-cut.glb')
trimesh.Trimesh(vertices=vertices, faces=np.array(faces_connected), visual=visual, process=False).export(root / 'office-surface.glb')
finite = depth[np.isfinite(depth) & mask]
stats = {
    'model': model_name,
    'model_revision': revision,
    'model_license': 'MIT (model card)',
    'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'device': 'CPU',
    'threads': torch.get_num_threads(),
    'torch_version': torch.__version__,
    'input_size': [pixels.shape[1], pixels.shape[0]],
    'resolution_level': 3,
    'inference_seconds_excluding_load': round(elapsed, 3),
    'vertices': len(vertices),
    'triangles': len(faces),
    'triangles_connected': len(faces_connected),
    'valid_fraction': round(float(mask.mean()), 5),
    'depth_percentiles': np.percentile(finite, [1, 50, 99]).tolist(),
    'intrinsics': intrinsics.tolist(),
    'vertical_fov_deg': float(2 * np.arctan(0.5 / intrinsics[1, 1]) * 180 / np.pi),
    'focus_depth': float(np.median(finite)),
    'scope': 'Visible surface reconstruction of a stylized illustration; not a complete room or rigged characters.',
}
(root / 'metrics.json').write_text(json.dumps(stats, indent=2))
print(json.dumps(stats, indent=2), flush=True)
