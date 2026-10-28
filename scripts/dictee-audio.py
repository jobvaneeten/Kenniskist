# Spreekt alle dicteewoorden en -zinnen in met de stem Fenna (edge-tts) en zet
# ze als mp3 in public/dictees/audio/. De bestandsnaam is een FNV-1a-hash van de
# tekst; de dictees rekenen dezelfde hash uit (kkHash) en vallen terug op de
# browserstem als er geen bestand is. Bestaande bestanden worden overgeslagen,
# dus na nieuwe woorden is opnieuw draaien genoeg:
#   pip install edge-tts
#   python scripts/dictee-audio.py
import asyncio, glob, json, os, re
import edge_tts

STEM = "nl-NL-FennaNeural"
HIER = os.path.dirname(os.path.abspath(__file__))
DICTEES = os.path.join(HIER, "..", "public", "dictees")
UIT = os.path.join(DICTEES, "audio")
VAST = ["Schrijf op.", "Hallo, zo klink ik. Schrijf op: paardenbloem."]

STR = r'"((?:[^"\\]|\\.)*)"'
PAAR = re.compile(r'\{w:' + STR + r'\s*,\s*s:' + STR)

def js(s):
    return json.loads('"' + s.replace("\\'", "'") + '"')

def fnv(t):
    h = 0x811C9DC5
    for b in t.encode("utf-8"):
        h = ((h ^ b) * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"

def teksten():
    woorden, zinnen = set(), set(VAST)
    for f in glob.glob(os.path.join(DICTEES, "dictee-*.html")):
        for w, s in PAAR.findall(open(f, encoding="utf-8").read()):
            woorden.add(js(w)); zinnen.add(js(s))
    alles = [(t, "-12%") for t in sorted(woorden)] + [(t, "-4%") for t in sorted(zinnen - woorden)]
    namen = {}
    for t, _ in alles:
        assert namen.setdefault(fnv(t), t) == t, f"hash-botsing: {t!r} en {namen[fnv(t)]!r}"
    return alles

async def main():
    os.makedirs(UIT, exist_ok=True)
    werk = [(t, r) for t, r in teksten() if not os.path.exists(os.path.join(UIT, fnv(t) + ".mp3"))]
    print(f"{len(werk)} nieuwe opnames")
    sem = asyncio.Semaphore(6)
    async def een(t, r):
        async with sem:
            pad = os.path.join(UIT, fnv(t) + ".mp3")
            for poging in range(4):
                try:
                    await edge_tts.Communicate(t, STEM, rate=r).save(pad + ".tmp")
                    os.replace(pad + ".tmp", pad); return
                except Exception as e:
                    if poging == 3: print("mislukt:", t, e)
                    await asyncio.sleep(2 * (poging + 1))
    await asyncio.gather(*(een(t, r) for t, r in werk))

asyncio.run(main())
