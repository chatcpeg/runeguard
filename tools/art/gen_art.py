# -*- coding: utf-8 -*-
"""สร้างภาพประกอบของ Runeguard ผ่าน ComfyQ (lane runeguard-art)

ใช้:  python gen_art.py <ไฟล์ jobs.json>
jobs.json = {"subdir": "styletest", "jobs": [{"name", "prompt", "seed", "w", "h"}, ...]}

- กราฟ Qwen-Image 2.1 คัดจาก Infuencer/py/gen_images.py (ARCHS["qwen_image_2"]) ซึ่งใช้งานจริงแล้ว
- ภาพไปที่ D:\\Comfy-Desktop\\ComfyUI-Shared\\output\\Runeguard\\art\\<subdir>\\ (ไม่เก็บใน repo ตามกติกาเครื่องนี้)
- stdlib อย่างเดียว (Python312 ของเครื่องไม่มี numpy)
"""
import json
import sys
import time
import urllib.error
import urllib.request
import uuid

LANE = "runeguard-art"
BASE = "http://127.0.0.1:8190/q/" + LANE
WHO = "Runeguard art"
OUT_ROOT = r"D:\Comfy-Desktop\ComfyUI-Shared\output"

QWEN21 = {
    "unet": "qwen_image_2.1_bf16.safetensors",
    "clip": "qwen3vl_8b_bf16.safetensors", "clip_type": "qwen_image",
    "vae": "qwen_image_2.1_vae_bf16.safetensors",
    "steps": 40, "cfg": 1.0, "sampler": "euler", "scheduler": "simple",
}


def graph(prompt, seed, w, h, prefix):
    a = QWEN21
    return {
        "28": {"class_type": "UNETLoader", "inputs": {"unet_name": a["unet"], "weight_dtype": "default"}},
        "30": {"class_type": "CLIPLoader", "inputs": {"clip_name": a["clip"], "type": a["clip_type"], "device": "default"}},
        "29": {"class_type": "VAELoader", "inputs": {"vae_name": a["vae"]}},
        "27": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["30", 0], "text": prompt}},
        "33": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["27", 0]}},
        "13": {"class_type": "EmptyLatentImage", "inputs": {"width": w, "height": h, "batch_size": 1}},
        "3": {"class_type": "KSampler", "inputs": {
            "model": ["28", 0], "positive": ["27", 0], "negative": ["33", 0], "latent_image": ["13", 0],
            "seed": seed, "steps": a["steps"], "cfg": a["cfg"], "sampler_name": a["sampler"],
            "scheduler": a["scheduler"], "denoise": 1}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["29", 0]}},
        "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": prefix}},
    }


def http(path, body=None, timeout=60):
    req = urllib.request.Request(BASE + path, data=None if body is None else json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "X-ComfyQ-Who": WHO})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def main():
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    sub = spec["subdir"]
    pending = {}
    for j in spec["jobs"]:
        prefix = "Runeguard/art/%s/%s" % (sub, j["name"])
        body = {"prompt": graph(j["prompt"], j["seed"], j.get("w", 1024), j.get("h", 1024), prefix),
                "client_id": str(uuid.uuid4()),
                "comfyq": {"lane": LANE, "who": WHO, "label": "%s/%s" % (sub, j["name"])}}
        pid = http("/prompt", body)["prompt_id"]
        pending[pid] = j["name"]
        print("ส่งแล้ว", j["name"], pid, flush=True)
    t0 = time.time()
    while pending:
        time.sleep(8)
        for pid in list(pending):
            try:
                h = http("/history/" + pid, timeout=30)
            except Exception as e:  # ต่อไม่ได้ชั่วคราว รอบหน้าลองใหม่
                print("  ... ถามสถานะไม่ได้:", str(e)[:80], flush=True)
                continue
            e = h.get(pid)
            if not e:
                continue
            st = e.get("status", {})
            if st.get("status_str") == "error" or (st.get("completed") is False and st.get("messages")):
                msgs = [m for m in st.get("messages", []) if m[0] == "execution_error"]
                print("พัง", pending.pop(pid), json.dumps(msgs)[:400], flush=True)
                continue
            files = [im["filename"] for o in e.get("outputs", {}).values() for im in o.get("images", [])]
            if files:
                print("เสร็จ", pending.pop(pid), "->", OUT_ROOT + "\\Runeguard\\art\\" + sub + "\\" + files[0],
                      "(%.0f วิ)" % (time.time() - t0), flush=True)
    print("ครบทุกงาน", flush=True)


if __name__ == "__main__":
    main()
