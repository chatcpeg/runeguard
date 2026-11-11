# Runeguard art: cut the background of a production set with BiRefNet through ComfyQ (lane runeguard-art).
# Use: python cut_bg.py <set> [name prefixes...]   e.g. python cut_bg.py v2   (prod_v2 -> cut_v2 · ground tiles gr_* are skipped,
# images already cut are skipped) · output: D:\Comfy-Desktop\ComfyUI-Shared\output\Runeguard\art\cut_<set>\<name>_00001_.png (RGBA)
# Generated media never goes into the repo.
import json, os, sys, time, uuid, urllib.request
BASE = 'http://127.0.0.1:8190/q/runeguard-art'
HDR = {'X-ComfyQ-Who': 'Runeguard art'}
SET = sys.argv[1] if len(sys.argv) > 1 else 'v1'
SRC = r'D:\Comfy-Desktop\ComfyUI-Shared\output\Runeguard\art\prod_' + SET
OUT = r'D:\Comfy-Desktop\ComfyUI-Shared\output\Runeguard\art\cut_' + SET

def req(path, data=None, ctype=None, timeout=120):
    h = dict(HDR)
    if ctype: h['Content-Type'] = ctype
    r = urllib.request.Request(BASE + path, data=data, headers=h)
    with urllib.request.urlopen(r, timeout=timeout) as f: return json.loads(f.read().decode('utf-8'))

def upload(fp):
    b = uuid.uuid4().hex; name = os.path.basename(fp)
    body = (f'--{b}\r\nContent-Disposition: form-data; name="image"; filename="rg_{name}"\r\nContent-Type: image/png\r\n\r\n').encode() + open(fp, 'rb').read() + \
           (f'\r\n--{b}\r\nContent-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n--{b}--\r\n').encode()
    return req('/upload/image', body, 'multipart/form-data; boundary=' + b)['name']

def graph(img, prefix):
    return {
      '1': {'class_type': 'LoadImage', 'inputs': {'image': img}},
      '2': {'class_type': 'LoadBackgroundRemovalModel', 'inputs': {'bg_removal_name': 'birefnet.safetensors'}},
      '3': {'class_type': 'RemoveBackground', 'inputs': {'bg_removal_model': ['2', 0], 'image': ['1', 0]}},
      '4': {'class_type': 'InvertMask', 'inputs': {'mask': ['3', 0]}},
      '5': {'class_type': 'JoinImageWithAlpha', 'inputs': {'image': ['1', 0], 'alpha': ['4', 0]}},
      '6': {'class_type': 'SaveImage', 'inputs': {'images': ['5', 0], 'filename_prefix': prefix}}}

done = set(os.listdir(OUT)) if os.path.isdir(OUT) else set()
files = sorted(f for f in os.listdir(SRC) if f.endswith('.png') and not f.startswith('gr_') and f not in done)
only = sys.argv[2:]
if only: files = [f for f in files if any(f.startswith(o) for o in only)]
jobs = {}
for f in files:
    name = f.replace('_00001_.png', '').replace('_00002_.png', '_b')
    img = upload(os.path.join(SRC, f))
    pid = req('/prompt', json.dumps({'prompt': graph(img, 'Runeguard/art/cut_' + SET + '/' + name), 'comfyq': {'label': 'cut ' + name}}).encode(), 'application/json')['prompt_id']
    jobs[pid] = name; print('queued', name, pid, flush=True)
t0 = time.time()
while jobs and time.time() - t0 < 3600:
    time.sleep(4)
    for pid in list(jobs):
        try: h = req('/history/' + pid, timeout=30)
        except Exception as e: continue
        if pid in h:
            st = h[pid].get('status', {})
            print(('done ' if st.get('status_str') == 'success' else 'FAIL ') + jobs[pid], json.dumps(st.get('messages', [])[-1:], ensure_ascii=False)[:300] if st.get('status_str') != 'success' else '', flush=True)
            del jobs[pid]
print('left', list(jobs.values()))
