# Spreekt de woorden van het nieuwkomersgedeelte in met de stem Fenna
# (edge-tts, dezelfde stem als de dictees, zie dictee-audio.py) en zet ze als
# mp3 in public/nk/<code>/audio/<woord-id>.mp3. De woorden komen uit THEMAS in
# public/nk/<code>/index.html. Bestaande bestanden worden overgeslagen.
#   pip install edge-tts
#   python scripts/nk-audio.py
import asyncio, glob, json, os, re
import edge_tts

STEM = "nl-NL-FennaNeural"
HIER = os.path.dirname(os.path.abspath(__file__))
# Woorden die de stem anders verkeerd (bv. Engels) uitspreekt: zo schrijven
# we ze voor de stem. Na een wijziging het mp3-bestand weggooien en opnieuw draaien.
UITSPRAAK = {"surprise": "surprieze", "ozosnel": "Ozo snel"}
WOORD = re.compile(r"\['([a-z0-9-]+)',\s*'([^']+)',\s*'[a-z]+'\]")

async def main():
    werk = []
    for pagina in glob.glob(os.path.join(HIER, "..", "public", "nk", "*", "index.html")):
        uit = os.path.join(os.path.dirname(pagina), "audio")
        os.makedirs(uit, exist_ok=True)
        for wid, tekst in WOORD.findall(open(pagina, encoding="utf-8").read()):
            pad = os.path.join(uit, wid + ".mp3")
            if not os.path.exists(pad):
                werk.append((UITSPRAAK.get(wid, tekst), pad, STEM, "-12%"))
        # vertalingen (vertaling.json): audio/<taal>/<woord-id>.mp3, alleen voor talen met een stem
        vt = os.path.join(os.path.dirname(pagina), "vertaling.json")
        if os.path.exists(vt):
            v = json.load(open(vt, encoding="utf-8"))
            for taal in v["talen"]:
                if not taal.get("stem"): continue
                map_ = os.path.join(uit, taal["id"]); os.makedirs(map_, exist_ok=True)
                for wid, t in v["woorden"].items():
                    pad = os.path.join(map_, wid + ".mp3")
                    if not os.path.exists(pad):
                        werk.append((t[taal.get("spreek", taal["id"])], pad, taal["stem"], "-8%"))
    print(f"{len(werk)} nieuwe opnames")
    sem = asyncio.Semaphore(6)
    async def een(tekst, pad, stem, tempo):
        async with sem:
            for poging in range(4):
                try:
                    await edge_tts.Communicate(tekst, stem, rate=tempo).save(pad + ".tmp")
                    os.replace(pad + ".tmp", pad); return
                except Exception as e:
                    if poging == 3: print("mislukt:", tekst, e)
                    await asyncio.sleep(2 * (poging + 1))
    await asyncio.gather(*(een(*w) for w in werk))

asyncio.run(main())
