# -*- coding: utf-8 -*-
"""รวมภาพทดสอบสไตล์เป็นแผ่นเดียว (แถว = สไตล์, คอลัมน์ = ตัว) · PIL อย่างเดียว

ใช้:  python contact_sheet.py <โฟลเดอร์ภาพ> <ไฟล์ผลลัพธ์.jpg>
ไฟล์ในโฟลเดอร์ชื่อ <แถว>_<ตัว>_00001_.png เช่น A_swordsman_00001_.png
"""
import glob
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROWS = [("A", "แบบ A · อนิเมะชิบิ ลายเส้นบาง"), ("B", "แบบ B · ภาพวาดสีน้ำแบบนิทาน"), ("C", "แบบ C · สไปรต์ขอบหนา สีแบน")]
COLS = [("swordsman", "นักดาบ"), ("onion", "หัวหอมเดินได้"), ("ramking", "ราชาแพะเขาหิน (บอส)")]
CELL = 420
HEAD = 56
LABEL = 260


def font(size):
    for f in (r"C:\Windows\Fonts\LeelawUI.ttf", r"C:\Windows\Fonts\tahoma.ttf"):
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def latest(folder, stem):
    files = sorted(glob.glob(os.path.join(folder, stem + "_*.png")), key=os.path.getmtime)
    return files[-1] if files else None


def main():
    folder, out = sys.argv[1], sys.argv[2]
    W = LABEL + CELL * len(COLS)
    H = HEAD + CELL * len(ROWS)
    sheet = Image.new("RGB", (W, H), (24, 26, 32))
    d = ImageDraw.Draw(sheet)
    f1, f2 = font(26), font(24)
    for ci, (_, name) in enumerate(COLS):
        d.text((LABEL + ci * CELL + 12, 14), name, font=f1, fill=(235, 235, 240))
    for ri, (key, name) in enumerate(ROWS):
        y = HEAD + ri * CELL
        words, line, lines = name.split(" "), "", []
        for w in words:
            if d.textlength((line + " " + w).strip(), font=f2) > LABEL - 24:
                lines.append(line)
                line = w
            else:
                line = (line + " " + w).strip()
        lines.append(line)
        for li, t in enumerate(lines):
            d.text((14, y + 20 + li * 34), t, font=f2, fill=(240, 210, 120))
        for ci, (stem, _) in enumerate(COLS):
            p = latest(folder, "%s_%s" % (key, stem))
            x = LABEL + ci * CELL
            if p:
                im = Image.open(p).convert("RGB")
                im.thumbnail((CELL - 8, CELL - 8))
                sheet.paste(im, (x + (CELL - im.width) // 2, y + (CELL - im.height) // 2))
            else:
                d.text((x + 20, y + CELL // 2), "(ไม่มีภาพ)", font=f2, fill=(200, 90, 90))
    sheet.save(out, quality=90)
    print(out)


if __name__ == "__main__":
    main()
