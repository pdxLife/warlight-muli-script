"""Builds an animated PNG (APNG) from PNG frames of the same size, without any image library.
Browsers play it; viewers that don't know APNG show its first frame as a plain PNG.

    python3 -I make_apng.py out.png delay_ms frame1.png frame2.png ...
"""
import struct, sys, zlib

def chunks(data):
    pos = 8
    while pos < len(data):
        length, kind = struct.unpack(">I4s", data[pos:pos + 8])
        yield kind, data[pos + 8:pos + 8 + length]
        pos += 12 + length

def decode(path):
    data = open(path, "rb").read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", path
    ihdr, idat = None, b""
    for kind, body in chunks(data):
        if kind == b"IHDR":
            ihdr = body
        elif kind == b"IDAT":
            idat += body
    width, height, depth, color, _, _, interlace = struct.unpack(">IIBBBBB", ihdr)
    assert depth == 8 and color in (2, 6) and interlace == 0, f"{path}: needs 8-bit RGB or RGBA, not interlaced"
    bpp = 3 if color == 2 else 4
    raw, stride = zlib.decompress(idat), width * bpp
    rows, prev = [], bytearray(stride)
    for y in range(height):
        kind, line = raw[y * (stride + 1)], bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        for i in range(stride):
            a = line[i - bpp] if i >= bpp else 0
            b, c = prev[i], prev[i - bpp] if i >= bpp else 0
            if kind == 1:
                line[i] = (line[i] + a) & 0xFF
            elif kind == 2:
                line[i] = (line[i] + b) & 0xFF
            elif kind == 3:
                line[i] = (line[i] + (a + b) // 2) & 0xFF
            elif kind == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 0xFF
        rows.append(bytes(line))
        prev = line
    return ihdr, width, height, rows

def chunk(kind, body):
    return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF)

def encode(out, delay_ms, paths):
    frames = [decode(p) for p in paths]
    ihdr, width, height, _ = frames[0]
    assert all(f[1:3] == (width, height) for f in frames), "frames must be the same size"
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"acTL", struct.pack(">II", len(frames), 0))
    seq = 0
    for index, (_, _, _, rows) in enumerate(frames):
        png += chunk(b"fcTL", struct.pack(">IIIIIHHBB", seq, width, height, 0, 0, delay_ms, 1000, 0, 0))
        seq += 1
        data = zlib.compress(b"".join(b"\x00" + r for r in rows), 9)
        if index == 0:
            png += chunk(b"IDAT", data)
        else:
            png += chunk(b"fdAT", struct.pack(">I", seq) + data)
            seq += 1
    png += chunk(b"IEND", b"")
    open(out, "wb").write(png)
    return len(png)

if __name__ == "__main__":
    print(encode(sys.argv[1], int(sys.argv[2]), sys.argv[3:]), "bytes")
