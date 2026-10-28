# Eigen dierenpicto's voor de dictees (public/dictees/dictee-*.html). Elk dier
# hoort bij een spellingregel; de tekeningen zijn hier zelf gemaakt als SVG en
# komen als data-URI in het IMAGES-object van elk dictee:
#   python scripts/dictee-picto.py            → vervangt IMAGES in alle dictees
#   python scripts/dictee-picto.py voorbeeld  → public/_picto-voorbeeld.html
import glob, os, re, sys, urllib.parse

HIER = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(HIER, "..", "public")

D = "#14122b"   # donker: pupillen, neusjes, lijntjes
W = "#f8fafc"   # wit
L = "#e2e8f0"   # lichte rand voor donkere dieren

def oog(x, y, r=2.6):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{W}"/><circle cx="{x + r * .25}" cy="{y}" r="{r * .55}" fill="{D}"/>'

def stip(x, y, r=1.8):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{D}"/>'

def lijn(d, kleur=D, w=2):
    return f'<path d="{d}" fill="none" stroke="{kleur}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'

def poten(xs, y1, y2, kleur, w=3.5):
    return "".join(lijn(f"M{x} {y1}V{y2}", kleur, w) for x in xs)

def ring(cx, cy, r, n, rr, kleur):
    import math
    return "".join(f'<circle cx="{cx + r * math.cos(2 * math.pi * i / n):.1f}" cy="{cy + r * math.sin(2 * math.pi * i / n):.1f}" r="{rr}" fill="{kleur}"/>' for i in range(n))

def stekels(cx, cy, r1, r2, n, kleur, w=2):
    import math
    return "".join(lijn(f"M{cx + r1 * math.cos(2 * math.pi * i / n):.1f} {cy + r1 * math.sin(2 * math.pi * i / n):.1f}L{cx + r2 * math.cos(2 * math.pi * i / n):.1f} {cy + r2 * math.sin(2 * math.pi * i / n):.1f}", kleur, w) for i in range(n))

P = {}

P["slang"] = (lijn("M10 52C18 58 30 55 30 47S18 35 26 27S42 24 44 16", "#4ade80", 8)
  + lijn("M10 52C18 58 30 55 30 47S18 35 26 27S42 24 44 16", "#86efac", 2.5)
  + '<ellipse cx="47" cy="13" rx="8" ry="5.5" fill="#4ade80"/>' + oog(49, 11, 2.2)
  + lijn("M55 14l4-1m-4 1l4 2.5", "#f87171", 1.6))

P["stinkdier"] = ('<path d="M40 40C60 38 62 12 49 8C40 5 37 16 45 20C50 24 47 32 39 34Z" fill="#374151" stroke="' + L + '" stroke-width="1.5"/>'
  + '<ellipse cx="29" cy="44" rx="15" ry="10" fill="#374151" stroke="' + L + '" stroke-width="1.5"/>'
  + '<circle cx="15" cy="42" r="8" fill="#374151" stroke="' + L + '" stroke-width="1.5"/>'
  + lijn("M14 35C24 32 36 34 43 30C53 24 53 14 48 11", W, 3.5)
  + poten([20, 36], 52, 58, "#374151") + oog(12, 41, 2) + stip(8, 45, 1.6))

P["specht"] = ('<rect x="46" y="2" width="11" height="60" rx="3" fill="#a16207"/>' + lijn("M50 12v8M53 34v10", "#713f12", 1.5)
  + '<path d="M34 50L40 61L31 58Z" fill="#1f2937" stroke="' + L + '" stroke-width="1.2"/>'
  + '<ellipse cx="36" cy="37" rx="8.5" ry="15" fill="#1f2937" stroke="' + L + '" stroke-width="1.5"/>'
  + '<ellipse cx="33.5" cy="40" rx="4" ry="9" fill="' + W + '"/><ellipse cx="36" cy="52" rx="4" ry="2.5" fill="#ef4444"/>'
  + '<circle cx="38" cy="18" r="7.5" fill="#1f2937" stroke="' + L + '" stroke-width="1.5"/><path d="M33 15a5 5 0 0 1 9-2" fill="none" stroke="#ef4444" stroke-width="4" stroke-linecap="round"/>'
  + '<path d="M44.5 17L51 18L44.5 21Z" fill="#facc15"/>' + oog(40, 18, 2))

P["pechvogel"] = ('<path d="M16 16a7 7 0 0 1 13-4a6 6 0 0 1 11 3a5 5 0 0 1-1 9H18a5 5 0 0 1-2-8Z" fill="#94a3b8"/>'
  + lijn("M22 28l-2 4M30 28l-2 4M38 28l-2 4", "#60a5fa", 1.8)
  + '<circle cx="32" cy="45" r="14" fill="#60a5fa"/><path d="M19 47c4 6 10 8 14 6" fill="none" stroke="#3b82f6" stroke-width="3"/>'
  + '<circle cx="40" cy="34" r="3.5" fill="#f87171"/>'
  + '<rect x="35" y="32" width="11" height="4" rx="1.5" fill="#fde68a" transform="rotate(-35 40.5 34)"/><rect x="35" y="32" width="11" height="4" rx="1.5" fill="#fde68a" transform="rotate(35 40.5 34)"/>'
  + oog(27, 43, 2.4) + oog(36, 43, 2.4) + lijn("M24 39.5l5-1.5M39 39.5l-5-1.5", D, 1.6)
  + '<path d="M30 46L34 46L32 50Z" fill="#fb923c"/>' + lijn("M27 59v3m-2 0h4M37 59v3m-2 0h4", "#fb923c", 1.6))

P["stokstaart"] = (lijn("M30 56C38 60 44 58 46 54", "#c08a4a", 3)
  + '<ellipse cx="32" cy="40" rx="8.5" ry="16" fill="#d6a76c"/><ellipse cx="32" cy="43" rx="4.5" ry="11" fill="#f3d6a4"/>'
  + '<ellipse cx="32" cy="17" rx="6.5" ry="7.5" fill="#d6a76c"/><ellipse cx="32" cy="22" rx="3.5" ry="3" fill="#f3d6a4"/>'
  + '<circle cx="25.5" cy="14" r="2" fill="#a16207"/><circle cx="38.5" cy="14" r="2" fill="#a16207"/>'
  + '<ellipse cx="29" cy="16" rx="2.4" ry="2" fill="#7c4a1e"/><ellipse cx="35" cy="16" rx="2.4" ry="2" fill="#7c4a1e"/>' + stip(29, 16, 1.1) + stip(35, 16, 1.1) + stip(32, 21.5, 1.2)
  + lijn("M26 32c-3 4-2 7 1 8M38 32c3 4 2 7-1 8", "#b07a40", 3) + poten([28, 36], 54, 60, "#b07a40"))

P["beer"] = ('<circle cx="17" cy="18" r="7" fill="#b45309"/><circle cx="47" cy="18" r="7" fill="#b45309"/><circle cx="17" cy="18" r="3.5" fill="#fcd9a8"/><circle cx="47" cy="18" r="3.5" fill="#fcd9a8"/>'
  + '<circle cx="32" cy="35" r="19" fill="#b45309"/><ellipse cx="32" cy="42" rx="9" ry="7" fill="#fcd9a8"/>'
  + '<ellipse cx="32" cy="38.5" rx="3.5" ry="2.5" fill="' + D + '"/>' + lijn("M32 41v3m-3 1c2 2 4 2 6 0", D, 1.5) + oog(24, 30) + oog(40, 30))

P["haai"] = ('<path d="M25 27L32 10L39 26Z" fill="#64748b"/><path d="M3 35C16 24 40 22 53 30L62 21L60 35L62 47L53 39C40 46 16 46 3 35Z" fill="#94a3b8"/>'
  + '<path d="M6 37C18 44 38 44 50 38C38 41 18 41 6 37Z" fill="' + W + '"/><path d="M26 40L34 50L36 40Z" fill="#64748b"/>'
  + oog(13, 32, 2) + lijn("M20 31v6M23 30v7M26 30v7", "#475569", 1.3) + lijn("M5 38c4 1 7 1 10 0", D, 1.3))

P["leeuw"] = (ring(32, 32, 17, 12, 8, "#d97706") + '<circle cx="32" cy="32" r="18" fill="#f59e0b"/>'
  + '<circle cx="21" cy="19" r="4" fill="#fcd34d"/><circle cx="43" cy="19" r="4" fill="#fcd34d"/><circle cx="32" cy="33" r="13" fill="#fcd34d"/>'
  + '<ellipse cx="32" cy="40" rx="7" ry="5" fill="#fef3c7"/><path d="M29 36h6l-3 3.5Z" fill="#7c2d12"/>' + lijn("M32 39.5v2.5m-3 1c2 1.5 4 1.5 6 0", "#7c2d12", 1.4)
  + oog(26, 29, 2.3) + oog(38, 29, 2.3))

P["hond_hert"] = (lijn("M44 26l-6-12m3 6l-6-3M50 26l6-12m-3 6l6-3", "#fde68a", 2.5)
  + '<ellipse cx="40" cy="27" rx="4" ry="2.2" fill="#b45309" transform="rotate(-30 40 27)"/><ellipse cx="54" cy="27" rx="4" ry="2.2" fill="#b45309" transform="rotate(30 54 27)"/>'
  + '<ellipse cx="47" cy="36" rx="8" ry="10" fill="#b45309"/><ellipse cx="47" cy="43" rx="4.5" ry="4" fill="#fde68a"/>' + stip(47, 42, 1.6) + oog(43.5, 33, 1.9) + oog(50.5, 33, 1.9)
  + '<circle cx="18" cy="37" r="11" fill="#f59e0b"/><ellipse cx="8.5" cy="38" rx="4" ry="8" fill="#92400e"/><ellipse cx="27.5" cy="38" rx="4" ry="8" fill="#92400e"/>'
  + '<ellipse cx="18" cy="42" rx="5.5" ry="4.5" fill="#fef3c7"/><ellipse cx="18" cy="40" rx="2.2" ry="1.6" fill="' + D + '"/>' + oog(14, 34, 2) + oog(22, 34, 2))

ZEBRA = "M32 7C43 7 47 17 47 29C47 41 43 48 41 54C38 61 26 61 23 54C21 48 17 41 17 29C17 17 21 7 32 7Z"
P["gestreept"] = ('<ellipse cx="18" cy="11" rx="4.5" ry="8" fill="' + W + '" stroke="' + D + '" stroke-width="1.5" transform="rotate(-30 18 11)"/>'
  + '<ellipse cx="46" cy="11" rx="4.5" ry="8" fill="' + W + '" stroke="' + D + '" stroke-width="1.5" transform="rotate(30 46 11)"/>'
  + f'<defs><clipPath id="zb"><path d="{ZEBRA}"/></clipPath></defs><path d="{ZEBRA}" fill="{W}"/>'
  + '<g clip-path="url(#zb)" fill="none" stroke="' + D + '" stroke-width="3.2" stroke-linecap="round">'
  + "".join(f'<path d="M12 {y}Q32 {y + 7} 52 {y}"/>' for y in range(12, 46, 6)) + '</g>'
  + '<path d="M26 8l2-6 2 5 2-6 2 6 2-5 2 6Z" fill="' + D + '"/>'
  + '<ellipse cx="32" cy="53" rx="10" ry="7.5" fill="#334155"/>' + stip(28, 53, 1.6) + stip(36, 53, 1.6)
  + '<circle cx="23.5" cy="31" r="4" fill="' + W + '"/><circle cx="40.5" cy="31" r="4" fill="' + W + '"/>' + oog(23.5, 31, 2.8) + oog(40.5, 31, 2.8))

P["krekel"] = (lijn("M15 31C10 20 6 14 2 12M17 30C14 18 12 10 10 6", "#a3e635", 1.4)
  + '<ellipse cx="32" cy="37" rx="15" ry="6.5" fill="#65a30d"/><path d="M20 33C30 28 42 29 48 34C40 33 30 33 20 36Z" fill="#a3e635"/>'
  + '<circle cx="17" cy="35" r="5.5" fill="#84cc16"/>' + oog(16, 33.5, 1.8)
  + lijn("M38 39L48 22L56 44", "#84cc16", 3) + lijn("M22 41l-3 8M28 42l-1 8", "#84cc16", 2))

P["kikker"] = ('<ellipse cx="32" cy="42" rx="21" ry="15" fill="#22c55e"/><ellipse cx="32" cy="46" rx="12" ry="9" fill="#bbf7d0"/>'
  + '<circle cx="20" cy="26" r="8.5" fill="#22c55e"/><circle cx="44" cy="26" r="8.5" fill="#22c55e"/>' + oog(20, 25, 5) + oog(44, 25, 5)
  + lijn("M22 38c6 5 14 5 20 0", D, 2) + '<path d="M8 54c2-4 8-4 10 0M46 54c2-4 8-4 10 0" fill="#16a34a"/>')

P["duiven_ganzen"] = ('<ellipse cx="18" cy="44" rx="11" ry="8" fill="#94a3b8"/><path d="M26 42L34 38L30 46Z" fill="#64748b"/>'
  + '<circle cx="11" cy="33" r="5.5" fill="#94a3b8"/>' + lijn("M12 38c2 3 4 4 7 4", "#a78bfa", 3) + lijn("M13 39c2 2 4 3 6 3", "#34d399", 1.5)
  + '<path d="M5.5 32.5L2 34L5.5 35Z" fill="#fb923c"/>' + oog(10, 32, 1.6) + poten([16, 21], 51, 56, "#f87171", 1.8)
  + '<ellipse cx="45" cy="46" rx="13" ry="8.5" fill="' + W + '"/>' + lijn("M38 42C36 32 36 26 40 20", W, 6)
  + '<circle cx="41" cy="18" r="5" fill="' + W + '"/><path d="M45 16.5L52 18.5L45 20.5Z" fill="#fb923c"/>' + oog(42, 17, 1.6)
  + lijn("M50 45c-3-3-7-3-10-1", "#cbd5e1", 2) + poten([42, 48], 54, 60, "#fb923c", 2.2))

P["pauw_goudvis"] = ('<circle cx="22" cy="30" r="19" fill="#0d9488"/>' + ring(22, 30, 14.5, 9, 3, "#22d3ee") + ring(22, 30, 14.5, 9, 1.3, "#1e3a8a")
  + '<ellipse cx="22" cy="42" rx="5" ry="10" fill="#2563eb"/><circle cx="22" cy="29" r="4" fill="#2563eb"/>' + lijn("M22 25v-5m-2 1v-3m4 3v-3", "#60a5fa", 1.2)
  + '<path d="M25.5 29L29 30L25.5 31Z" fill="#facc15"/>' + oog(23, 28, 1.3) + poten([20, 24], 51, 57, "#94a3b8", 1.6)
  + '<path d="M54 44L62 37L61 51Z" fill="#fdba74"/><ellipse cx="47" cy="44" rx="9" ry="6.5" fill="#fb923c"/><path d="M45 38L49 34L50 39Z" fill="#fdba74"/>' + oog(42, 42.5, 1.8))

P["geit_bij"] = (lijn("M17 26C14 16 18 10 24 9M27 26C26 17 30 12 36 12", "#a8a29e", 3)
  + '<ellipse cx="11" cy="31" rx="5" ry="2.5" fill="#d6d3d1" transform="rotate(20 11 31)"/><ellipse cx="33" cy="31" rx="5" ry="2.5" fill="#d6d3d1" transform="rotate(-20 33 31)"/>'
  + '<ellipse cx="22" cy="38" rx="9" ry="13" fill="#e7e5e4"/><path d="M19 49L22 60L25 49Z" fill="#d6d3d1"/><ellipse cx="22" cy="46" rx="5" ry="3.5" fill="#fbcfe8"/>'
  + stip(20, 46, 1) + stip(24, 46, 1) + oog(18, 34, 2) + oog(26, 34, 2)
  + '<ellipse cx="45" cy="30" rx="6" ry="4" fill="' + W + '" fill-opacity=".8" transform="rotate(-25 45 30)"/><ellipse cx="52" cy="30" rx="6" ry="4" fill="' + W + '" fill-opacity=".8" transform="rotate(25 52 30)"/>'
  + '<ellipse cx="49" cy="41" rx="10" ry="7" fill="#facc15"/>' + lijn("M46 35v12M51 35v12", D, 2.5)
  + '<path d="M59 41L63 41L59 43Z" fill="' + D + '"/><circle cx="40" cy="40" r="4" fill="#1f2937"/>' + oog(39, 39, 1.3))

P["muisje"] = (lijn("M46 46C56 50 60 42 56 38C53 35 50 40 54 42", "#f9a8d4", 2)
  + '<ellipse cx="34" cy="44" rx="15" ry="10" fill="#9ca3af"/><path d="M22 38C14 40 8 44 6 46C10 48 16 50 24 50Z" fill="#9ca3af"/>'
  + '<circle cx="23" cy="31" r="8" fill="#9ca3af"/><circle cx="23" cy="31" r="5" fill="#f9a8d4"/>' + oog(15, 42, 1.8)
  + '<circle cx="6" cy="46" r="2" fill="#f472b6"/>' + lijn("M8 46l-6-3M8 47l-6 1", "#cbd5e1", 1) + poten([28, 40], 52, 56, "#9ca3af", 2.5))

P["biggetje"] = (lijn("M12 36c-6-2-6 5-2 4", "#f472b6", 2)
  + '<ellipse cx="30" cy="40" rx="18" ry="13" fill="#f9a8d4"/><circle cx="44" cy="34" r="11" fill="#f9a8d4"/>'
  + '<path d="M38 25L40 17L45 24Z" fill="#f472b6"/><path d="M46 24L51 18L52 26Z" fill="#f472b6"/>'
  + '<ellipse cx="52" cy="37" rx="5" ry="4" fill="#f472b6"/>' + stip(50.5, 37, 1) + stip(53.5, 37, 1) + oog(44, 31, 2)
  + poten([20, 27, 34, 41], 50, 57, "#f472b6", 3.5))

P["lamaatje"] = ('<ellipse cx="27" cy="44" rx="15" ry="9" fill="#fef3c7"/><path d="M18 36h16v6H18Z" fill="#f472b6"/><path d="M18 39h16" stroke="#22d3ee" stroke-width="1.5"/>'
  + '<rect x="35" y="16" width="9" height="30" rx="4.5" fill="#fef3c7"/><ellipse cx="44" cy="16" rx="8" ry="5.5" fill="#fef3c7"/>'
  + '<ellipse cx="37" cy="9" rx="1.8" ry="4.5" fill="#fde68a" transform="rotate(-10 37 9)"/><ellipse cx="42" cy="8" rx="1.8" ry="4.5" fill="#fde68a" transform="rotate(10 42 8)"/>'
  + oog(43, 14, 1.8) + stip(51, 17, 1) + poten([17, 23, 31, 37], 50, 60, "#fde68a", 3.5))

P["winterkoninkje"] = (lijn("M4 56C20 52 40 54 60 51", "#a16207", 3.5) + '<ellipse cx="52" cy="48" rx="4" ry="2" fill="#4ade80" transform="rotate(-30 52 48)"/>'
  + '<path d="M36 38C38 28 42 18 46 12C48 10 52 12 51 15C48 24 46 32 44 40Z" fill="#92400e"/>' + lijn("M42 26l5 1.5M40 32l5 1.5", "#5b2a0a", 1.2)
  + '<ellipse cx="30" cy="42" rx="14" ry="11" fill="#b45309"/><ellipse cx="27" cy="46" rx="8" ry="5.5" fill="#fcd9a8"/>'
  + '<path d="M28 38C32 34 38 36 40 42C36 42 32 41 28 38Z" fill="#92400e"/>'
  + '<circle cx="19" cy="34" r="8" fill="#b45309"/>' + lijn("M13 30.5C16 29 21 29 24 31", "#fcd9a8", 1.6)
  + '<path d="M11.5 34L4 35L11.5 36.5Z" fill="#78350f"/>' + oog(17, 33.5, 1.9) + lijn("M26 52v3M32 52v3", "#78350f", 1.8))

P["ara"] = (lijn("M8 52H50", "#a16207", 3.5) + '<path d="M27 46L31 62L35 46Z" fill="#2563eb"/><path d="M29 48L31 60L33 48Z" fill="#ef4444"/>'
  + '<ellipse cx="31" cy="36" rx="9.5" ry="14" fill="#2563eb"/><ellipse cx="32" cy="39" rx="5" ry="9" fill="#facc15"/>'
  + '<path d="M24 32C20 40 22 46 28 48" fill="#1d4ed8"/><circle cx="31" cy="18" r="8.5" fill="#2563eb"/><ellipse cx="35" cy="19" rx="3.5" ry="4" fill="' + W + '"/>'
  + '<path d="M38 16C44 16 45 22 41 25L38 23Z" fill="' + D + '"/>' + oog(33.5, 17, 1.8) + lijn("M27 50v3M35 50v3", "#94a3b8", 2))

P["gevaarlijk"] = (lijn("M34 46C46 48 52 38 50 26C49 18 42 14 38 18", "#fb923c", 5) + '<path d="M38 18L33 12L41 15Z" fill="#ef4444"/>'
  + '<ellipse cx="26" cy="44" rx="11" ry="7" fill="#f97316"/>' + lijn("M22 39v10M27 38v12M32 39v10", "#c2410c", 1.5)
  + lijn("M17 42C12 38 10 34 10 30M17 46C11 48 8 52 8 56", "#fb923c", 3)
  + '<path d="M10 30C4 28 4 20 10 20L12 25L8 26C10 28 13 28 12 30Z" fill="#fb923c"/><path d="M8 56C2 58 2 64 8 63L9 59L6 58C8 57 10 57 9 56Z" fill="#fb923c"/>'
  + lijn("M22 50l-4 6M27 51l-1 7M31 50l3 6", "#fb923c", 1.6) + stip(17, 43, 1.3))

P["kameel"] = (poten([13, 20, 35, 42], 40, 58, "#b07d4f", 4.5) + lijn("M11 58h4M18 58h4M33 58h4M40 58h4", "#8a5a33", 2.5)
  + '<path d="M6 42C4 32 10 26 16 28C18 16 28 14 30 26C32 14 42 14 44 28C48 28 50 34 48 42C40 46 14 46 6 42Z" fill="#d4a373"/>'
  + '<path d="M18 24C20 20 26 20 28 26" fill="none" stroke="#e9c49a" stroke-width="2" stroke-linecap="round"/><path d="M32 24C34 20 40 20 42 26" fill="none" stroke="#e9c49a" stroke-width="2" stroke-linecap="round"/>'
  + '<path d="M42 34C48 30 50 22 50 16L57 14C58 24 54 34 48 40Z" fill="#d4a373"/><ellipse cx="56" cy="14" rx="7" ry="5" fill="#d4a373"/><ellipse cx="61" cy="16" rx="3" ry="2.6" fill="#c4935f"/>'
  + '<ellipse cx="52" cy="9" rx="1.6" ry="2.6" fill="#b07d4f"/>' + oog(55, 12, 1.8) + stip(62, 15.5, .9) + lijn("M6 38c-3 2-4 6-3 10", "#b07d4f", 2))

def panda(x, y, r):
    return (f'<circle cx="{x - r * .75}" cy="{y - r * .75}" r="{r * .38}" fill="#1f2937" stroke="{L}" stroke-width="1"/><circle cx="{x + r * .75}" cy="{y - r * .75}" r="{r * .38}" fill="#1f2937" stroke="{L}" stroke-width="1"/>'
      + f'<circle cx="{x}" cy="{y}" r="{r}" fill="{W}"/><ellipse cx="{x - r * .38}" cy="{y - r * .05}" rx="{r * .26}" ry="{r * .34}" fill="#1f2937" transform="rotate(25 {x - r * .38} {y})"/>'
      + f'<ellipse cx="{x + r * .38}" cy="{y - r * .05}" rx="{r * .26}" ry="{r * .34}" fill="#1f2937" transform="rotate(-25 {x + r * .38} {y})"/>'
      + f'<circle cx="{x - r * .36}" cy="{y - r * .1}" r="{r * .1}" fill="{W}"/><circle cx="{x + r * .36}" cy="{y - r * .1}" r="{r * .1}" fill="{W}"/>'
      + f'<ellipse cx="{x}" cy="{y + r * .35}" rx="{r * .16}" ry="{r * .11}" fill="#1f2937"/>')
P["pandas"] = panda(20, 30, 13) + panda(44, 40, 13)

P["krab"] = (lijn("M18 40C10 36 8 28 10 22M46 40C54 36 56 28 54 22", "#ef4444", 3)
  + '<path d="M10 22C4 20 4 12 9 10L11 16L14 12C16 16 14 22 10 22Z" fill="#ef4444"/><path d="M54 22C60 20 60 12 55 10L53 16L50 12C48 16 50 22 54 22Z" fill="#ef4444"/>'
  + lijn("M18 46l-8 4M18 50l-6 6M46 46l8 4M46 50l6 6", "#ef4444", 2.2)
  + '<ellipse cx="32" cy="44" rx="16" ry="10" fill="#ef4444"/><ellipse cx="32" cy="41" rx="11" ry="5" fill="#f87171"/>'
  + lijn("M27 36v-6M37 36v-6", "#ef4444", 2) + oog(27, 29, 2.3) + oog(37, 29, 2.3) + lijn("M28 47c2 2 6 2 8 0", D, 1.5))

P["eieren"] = ('<ellipse cx="25" cy="32" rx="9" ry="12" fill="#fef3c7"/><ellipse cx="40" cy="34" rx="9" ry="12" fill="' + W + '"/>'
  + '<ellipse cx="22" cy="27" rx="2.5" ry="4" fill="' + W + '" fill-opacity=".8"/>'
  + '<path d="M6 40C8 54 20 58 32 58S56 54 58 40C50 44 14 44 6 40Z" fill="#a16207"/>'
  + lijn("M8 44C20 48 44 48 56 44M10 50C22 54 42 54 54 50M14 42l6 10M26 44l3 12M40 44l-2 12M50 42l-5 10", "#d97706", 1.4))

P["citroenvlinder"] = (lijn("M30 16C27 10 24 8 21 8M34 16C37 10 40 8 43 8", "#a3a3a3", 1.3)
  + '<path d="M30 30C20 12 6 12 6 24C6 32 18 36 30 34Z" fill="#fde047"/><path d="M34 30C44 12 58 12 58 24C58 32 46 36 34 34Z" fill="#fde047"/>'
  + '<path d="M30 36C18 36 12 46 18 52C24 56 30 46 30 40Z" fill="#facc15"/><path d="M34 36C46 36 52 46 46 52C40 56 34 46 34 40Z" fill="#facc15"/>'
  + '<circle cx="18" cy="25" r="2" fill="#fb923c"/><circle cx="46" cy="25" r="2" fill="#fb923c"/><circle cx="22" cy="46" r="1.6" fill="#fb923c"/><circle cx="42" cy="46" r="1.6" fill="#fb923c"/>'
  + '<ellipse cx="32" cy="34" rx="2.5" ry="14" fill="#57534e"/>')

P["hoogte"] = ('<path d="M24 38L32 10L40 10L38 40Z" fill="#f59e0b"/><ellipse cx="38" cy="10" rx="9" ry="5" fill="#f59e0b"/>'
  + lijn("M34 6V1M39 6V1", "#92400e", 2) + '<circle cx="34" cy="1" r="1.5" fill="#92400e"/><circle cx="39" cy="1" r="1.5" fill="#92400e"/>'
  + '<ellipse cx="30" cy="44" rx="13" ry="8" fill="#f59e0b"/>' + poten([21, 26, 34, 39], 48, 62, "#f59e0b", 3.5)
  + "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#92400e"/>' for x, y, r in [(33, 18, 2), (31, 26, 2.2), (35, 32, 2), (29, 34, 1.8), (24, 42, 2.4), (32, 46, 2.2), (38, 42, 2)])
  + oog(41, 9, 1.6) + stip(46, 11, .9) + lijn("M54 60V6m-3 3l3-3 3 3m-6 48l3 3 3-3", "#22d3ee", 1.6))

P["bizon"] = ('<path d="M8 42C6 30 14 18 28 18C36 18 40 22 46 28C52 28 58 34 58 42C58 48 52 50 46 48L14 48C10 48 8 46 8 42Z" fill="#78350f" stroke="#d6a76c" stroke-width="1.2"/>'
  + '<path d="M8 30C4 34 4 44 10 48C14 50 18 46 18 40C18 34 14 30 8 30Z" fill="#451a03" stroke="#d6a76c" stroke-width="1.2"/>'
  + lijn("M8 32C4 30 3 26 5 24", "#e7e5e4", 2.2) + '<path d="M9 46L11 54L14 46Z" fill="#451a03"/>' + oog(10, 37, 1.6)
  + poten([20, 26, 44, 50], 47, 60, "#451a03", 4) + lijn("M58 40c3 2 3 6 2 8", "#78350f", 2))

P["tropisch"] = ('<path d="M8 32C14 18 28 10 40 14L36 24C42 26 46 28 48 32C46 36 42 38 36 40L40 50C28 54 14 46 8 32Z" fill="#facc15"/>'
  + '<defs><clipPath id="tv"><path d="M8 32C14 18 28 10 40 14L36 24C42 26 46 28 48 32C46 36 42 38 36 40L40 50C28 54 14 46 8 32Z"/></clipPath></defs>'
  + '<g clip-path="url(#tv)" fill="none" stroke="#2563eb" stroke-width="4.5"><path d="M18 8V58M30 8V58"/></g>'
  + '<path d="M48 32L60 22L58 32L60 42Z" fill="#22d3ee"/>' + oog(13, 30, 2))

P["snachts"] = ('<path d="M44 6A20 20 0 1 0 58 40A16 16 0 1 1 44 6Z" fill="#fde047"/>'
  + "".join(f'<path d="M{x} {y - 4}L{x + 1.2} {y - 1.2}L{x + 4} {y}L{x + 1.2} {y + 1.2}L{x} {y + 4}L{x - 1.2} {y + 1.2}L{x - 4} {y}L{x - 1.2} {y - 1.2}Z" fill="#fde047"/>' for x, y in [(16, 12), (54, 50)])
  + '<path d="M32 30C26 24 16 22 6 28C10 30 12 34 12 38C16 36 20 36 24 40C26 36 28 34 32 34C36 34 38 36 40 40C44 36 48 36 52 38C52 34 54 30 58 28C48 22 38 24 32 30Z" fill="#6d28d9" stroke="#c4b5fd" stroke-width="1.2"/>'
  + '<path d="M29 29L28 23L31 27L33 27L36 23L35 29Z" fill="#6d28d9" stroke="#c4b5fd" stroke-width="1"/>' + '<circle cx="30" cy="30" r="1.1" fill="#fde047"/><circle cx="34" cy="30" r="1.1" fill="#fde047"/>')

P["politiehond"] = ('<path d="M12 30L14 4L28 20Z" fill="#78350f"/><path d="M52 30L50 4L36 20Z" fill="#78350f"/><path d="M15 22L16 9L24 19Z" fill="#f9a8d4"/><path d="M49 22L48 9L40 19Z" fill="#f9a8d4"/>'
  + '<path d="M14 30C14 20 22 16 32 16S50 20 50 30C50 40 44 46 40 50H24C20 46 14 40 14 30Z" fill="#d97706"/>'
  + '<path d="M32 16C26 16 24 22 26 28L32 34L38 28C40 22 38 16 32 16Z" fill="#292524"/>'
  + '<path d="M24 38C24 32 28 30 32 30S40 32 40 38C40 46 36 50 32 50S24 46 24 38Z" fill="#fde68a"/>'
  + '<ellipse cx="32" cy="35" rx="4" ry="3" fill="' + D + '"/>' + lijn("M32 38v3m-4 1.5c2 2 6 2 8 0", D, 1.5) + oog(24, 28, 2.4) + oog(40, 28, 2.4)
  + '<path d="M18 18C18 10 46 10 46 18L44 21C38 18 26 18 20 21Z" fill="#1d4ed8"/><path d="M18 19C24 23 40 23 46 19L48 22C40 26 24 26 16 22Z" fill="#1e3a8a"/>'
  + '<path d="M32 11l1.6 3.2 3.4.5-2.5 2.4.6 3.4-3.1-1.6-3.1 1.6.6-3.4-2.5-2.4 3.4-.5Z" fill="#facc15"/>'
  + '<path d="M20 50H44L48 62H16Z" fill="#1d4ed8"/><rect x="24" y="54" width="16" height="4" rx="1" fill="#facc15"/>')

P["cavia"] = ('<path d="M6 42C6 28 18 20 32 20C46 20 58 28 58 40C58 48 52 50 46 50H14C8 50 6 48 6 42Z" fill="#c2410c"/>'
  + '<path d="M26 20C30 30 28 42 22 50H38C34 40 36 28 42 21C36 19 30 19 26 20Z" fill="' + W + '"/>'
  + '<ellipse cx="50" cy="24" rx="4" ry="3" fill="#fdba74"/>' + oog(48, 33, 2.2) + '<circle cx="57" cy="39" r="1.8" fill="#f9a8d4"/>'
  + lijn("M56 41l6 1M56 42l5 4", "#fde68a", .9) + '<ellipse cx="16" cy="50" rx="4" ry="2" fill="#fdba74"/><ellipse cx="46" cy="50" rx="4" ry="2" fill="#fdba74"/>')

P["baviaan_leguaan"] = (ring(18, 28, 11, 10, 5, "#a8a29e") + '<circle cx="18" cy="28" r="12" fill="#a8a29e"/>'
  + '<ellipse cx="18" cy="36" rx="6" ry="9" fill="#f87171"/>' + stip(16, 41, 1) + stip(20, 41, 1) + oog(14, 25, 2) + oog(22, 25, 2) + lijn("M11 22h14", "#78716c", 2.2)
  + lijn("M38 52C48 56 58 54 62 46", "#4ade80", 3) + '<path d="M28 48C30 42 40 40 48 44C52 46 52 50 48 52L32 54C28 54 28 50 28 48Z" fill="#22c55e"/>'
  + '<path d="M28 48C26 40 30 36 36 38L38 44Z" fill="#22c55e"/><path d="M30 46C30 52 34 54 36 50Z" fill="#facc15"/>'
  + "".join(f'<path d="M{x} {y}l2-4 2 4Z" fill="#86efac"/>' for x, y in [(32, 38), (36, 40), (40, 42), (44, 43)])
  + oog(31, 41, 1.6) + poten([34, 46], 53, 58, "#22c55e", 2.5))

P["chimpansee"] = ('<circle cx="12" cy="32" r="7" fill="#78350f"/><circle cx="52" cy="32" r="7" fill="#78350f"/><circle cx="12" cy="32" r="4" fill="#fcd9a8"/><circle cx="52" cy="32" r="4" fill="#fcd9a8"/>'
  + '<circle cx="32" cy="30" r="20" fill="#78350f"/><path d="M32 26C36 18 46 20 46 28C46 34 44 38 44 42C44 50 38 54 32 54S20 50 20 42C20 38 18 34 18 28C18 20 28 18 32 26Z" fill="#fcd9a8"/>'
  + oog(26, 30, 2.4) + oog(38, 30, 2.4) + stip(30, 39, 1.1) + stip(34, 39, 1.1) + lijn("M25 45c4 3 10 3 14 0", "#78350f", 2))

P["puppy"] = ('<ellipse cx="14" cy="32" rx="7" ry="13" fill="#92400e" transform="rotate(15 14 32)"/><ellipse cx="50" cy="32" rx="7" ry="13" fill="#92400e" transform="rotate(-15 50 32)"/>'
  + '<circle cx="32" cy="32" r="17" fill="#fde68a"/><ellipse cx="25" cy="28" rx="6" ry="7" fill="#d97706"/>'
  + '<ellipse cx="32" cy="40" rx="8" ry="6.5" fill="#fef3c7"/><ellipse cx="32" cy="37" rx="3.5" ry="2.6" fill="' + D + '"/>'
  + '<path d="M29 43h6v5a3 3 0 0 1-6 0Z" fill="#f472b6"/>' + oog(25, 29, 2.8) + oog(39, 29, 2.8))

P["jaguar"] = ('<circle cx="17" cy="16" r="6" fill="#f59e0b"/><circle cx="47" cy="16" r="6" fill="#f59e0b"/><circle cx="17" cy="16" r="3" fill="#292524"/><circle cx="47" cy="16" r="3" fill="#292524"/>'
  + '<circle cx="32" cy="34" r="19" fill="#f59e0b"/><ellipse cx="32" cy="43" rx="10" ry="7.5" fill="#fef3c7"/>'
  + "".join(f'<circle cx="{x}" cy="{y}" r="2.6" fill="none" stroke="#292524" stroke-width="1.6"/>' for x, y in [(22, 22), (32, 19), (42, 22), (17, 33), (47, 33), (20, 44), (44, 44)])
  + '<path d="M28 38h8l-4 4Z" fill="#9f1239"/>' + lijn("M32 42v3m-4 1c2 2 6 2 8 0", "#292524", 1.4) + oog(25, 31, 2.4) + oog(39, 31, 2.4))

P["page"] = (lijn("M30 16C28 10 25 8 22 8M34 16C36 10 39 8 42 8", "#a3a3a3", 1.3)
  + '<path d="M30 30C22 12 6 12 4 22C4 30 16 34 30 34Z" fill="#fde047"/><path d="M34 30C42 12 58 12 60 22C60 30 48 34 34 34Z" fill="#fde047"/>'
  + '<path d="M30 36C20 36 14 44 18 50L16 60L22 52C28 52 30 44 30 40Z" fill="#fde047"/><path d="M34 36C44 36 50 44 46 50L48 60L42 52C36 52 34 44 34 40Z" fill="#fde047"/>'
  + lijn("M12 16L22 31M20 14L27 30M52 16L42 31M44 14L37 30M8 28h20M56 28H36", D, 2)
  + '<circle cx="21" cy="47" r="2" fill="#60a5fa"/><circle cx="43" cy="47" r="2" fill="#60a5fa"/><circle cx="24" cy="51" r="1.5" fill="#ef4444"/><circle cx="40" cy="51" r="1.5" fill="#ef4444"/>'
  + '<ellipse cx="32" cy="34" rx="2.5" ry="14" fill="#1f2937" stroke="' + L + '" stroke-width=".8"/>')

P["axolotl"] = ("".join(lijn(d, "#ec4899", 3) for d in ["M18 26l-9-6", "M17 31l-11-1", "M18 36l-9 5", "M46 26l9-6", "M47 31l11-1", "M46 36l9 5"])
  + lijn("M32 46C40 56 52 58 60 54", "#f9a8d4", 6) + '<ellipse cx="32" cy="46" rx="11" ry="9" fill="#f9a8d4"/>'
  + '<ellipse cx="32" cy="31" rx="14" ry="11" fill="#f9a8d4"/>' + oog(25, 29, 2.4) + oog(39, 29, 2.4) + lijn("M26 36c4 3 8 3 12 0", "#be185d", 1.8)
  + lijn("M23 52l-4 6M41 52l4 6", "#f9a8d4", 3))

P["weetwoord"] = ('<path d="M14 18L32 10L50 18L32 26Z" fill="#1f2937" stroke="' + L + '" stroke-width="1.2"/>' + lijn("M50 18v8", "#facc15", 1.6) + '<circle cx="50" cy="27" r="1.8" fill="#facc15"/>'
  + '<path d="M18 22L14 16L24 22Z" fill="#92400e"/><path d="M46 22L50 16L40 22Z" fill="#92400e"/>'
  + '<path d="M16 34C16 24 24 20 32 20S48 24 48 34V48C48 56 40 60 32 60S16 56 16 48Z" fill="#92400e"/><ellipse cx="32" cy="48" rx="10" ry="10" fill="#fcd9a8"/>'
  + lijn("M27 44l2 2 2-2 2 2 2-2 2 2M27 50l2 2 2-2 2 2 2-2 2 2", "#b45309", 1.2)
  + '<circle cx="25" cy="33" r="7" fill="#fde68a"/><circle cx="39" cy="33" r="7" fill="#fde68a"/>' + '<circle cx="25" cy="33" r="3.5" fill="#facc15"/><circle cx="39" cy="33" r="3.5" fill="#facc15"/>' + stip(25, 33, 2) + stip(39, 33, 2)
  + '<path d="M30 38L34 38L32 43Z" fill="#fb923c"/>')

P["python"] = ('<ellipse cx="32" cy="50" rx="24" ry="8" fill="#ca8a04"/><ellipse cx="32" cy="40" rx="19" ry="7" fill="#eab308"/><ellipse cx="32" cy="31" rx="13" ry="5.5" fill="#ca8a04"/>'
  + "".join(f'<ellipse cx="{x}" cy="{y}" rx="3" ry="1.8" fill="#713f12"/>' for x, y in [(14, 50), (26, 54), (40, 54), (52, 49), (20, 40), (34, 43), (46, 39), (26, 31), (38, 30)])
  + lijn("M36 28C40 20 38 14 32 12", "#eab308", 6) + '<ellipse cx="29" cy="11" rx="7" ry="5" fill="#eab308"/>' + oog(27, 9.5, 1.8) + lijn("M22 12l-4-1m4 1l-4 2", "#f87171", 1.4))

P["snelheid"] = (lijn("M2 30h10M4 38h12M2 46h9", "#22d3ee", 2.2)
  + '<path d="M16 40C18 30 30 26 42 30C48 32 50 36 52 38C50 44 44 48 36 48L20 48C16 48 14 44 16 40Z" fill="#a16207"/>'
  + '<ellipse cx="52" cy="32" rx="8" ry="6.5" fill="#a16207"/><ellipse cx="44" cy="20" rx="13" ry="3" fill="#a16207" transform="rotate(20 44 20)"/><ellipse cx="46" cy="22" rx="11" ry="2.5" fill="#92400e" transform="rotate(25 46 22)"/>'
  + '<circle cx="18" cy="38" r="4" fill="' + W + '"/>' + oog(54, 30, 1.9) + stip(59.5, 33, 1)
  + lijn("M22 46L10 54M24 46L14 58M40 46L50 58M44 44L58 52", "#92400e", 3))

P["wollen"] = (poten([22, 28, 38, 44], 46, 58, "#4b5563", 3.5) + ring(32, 38, 12, 10, 7, W) + '<ellipse cx="32" cy="38" rx="16" ry="11" fill="' + W + '"/>'
  + '<ellipse cx="50" cy="30" rx="7" ry="8.5" fill="#4b5563" stroke="' + L + '" stroke-width="1"/><ellipse cx="44" cy="25" rx="4" ry="2" fill="#4b5563" transform="rotate(-30 44 25)"/>'
  + '<circle cx="50" cy="22" r="4" fill="' + W + '"/>' + oog(52, 29, 1.6) + stip(52, 36, .9))

P["pinguin"] = ('<ellipse cx="32" cy="36" rx="15" ry="22" fill="#1e293b" stroke="' + L + '" stroke-width="1.5"/><ellipse cx="32" cy="40" rx="10" ry="16" fill="' + W + '"/>'
  + '<path d="M17 30C10 36 10 44 14 48Z" fill="#1e293b" stroke="' + L + '" stroke-width="1.2"/><path d="M47 30C54 36 54 44 50 48Z" fill="#1e293b" stroke="' + L + '" stroke-width="1.2"/>'
  + '<path d="M28 22h8l-4 5Z" fill="#fb923c"/>' + oog(27, 18, 2) + oog(37, 18, 2)
  + '<ellipse cx="26" cy="58" rx="5" ry="2.5" fill="#fb923c"/><ellipse cx="38" cy="58" rx="5" ry="2.5" fill="#fb923c"/>')

P["gespleten"] = (lijn("M38 38C50 40 56 48 62 56", "#2dd4bf", 4) + '<path d="M12 34C16 28 30 28 40 34C42 38 38 42 30 42H18C12 42 10 38 12 34Z" fill="#14b8a6"/>'
  + '<ellipse cx="14" cy="34" rx="8" ry="5.5" fill="#14b8a6"/>' + oog(13, 32, 1.8) + lijn("M7 36H1m0 0l-2-2m2 2l-2 2", "#f87171", 1.6)
  + lijn("M18 40l-4 8M24 41l2 8M34 40l-2 8M38 39l4 8", "#14b8a6", 2.5)
  + "".join(f'<circle cx="{x}" cy="{y}" r="1.4" fill="#99f6e4"/>' for x, y in [(20, 33), (26, 32), (32, 34)]))

def ree(x, y, s):
    return (f'<g transform="translate({x} {y}) scale({s})">'
      + '<path d="M0 0C0-6 6-8 14-8C20-8 22-6 22-2C22 2 18 4 14 4H4C2 4 0 3 0 0Z" fill="#b45309"/>'
      + '<path d="M18-6L22-18L28-16L24-4Z" fill="#b45309"/><ellipse cx="27" cy="-18" rx="5" ry="3.5" fill="#b45309"/>'
      + '<ellipse cx="23" cy="-22" rx="1.5" ry="3" fill="#92400e"/>' + lijn("M22-22l-1-6m1 3l-3-1M25-22l1-6m-1 3l3-1", "#fde68a", 1.3)
      + '<circle cx="1" cy="-2" r="2.5" fill="' + W + '"/>' + stip(28, -19, .9) + stip(31.5, -17, .8)
      + poten([3, 7, 15, 19], 2, 16, "#92400e", 2) + '</g>')
P["reeen"] = ree(2, 34, 1.0) + ree(26, 46, .9)

P["reuzenschildpad"] = ('<ellipse cx="54" cy="40" rx="7" ry="5" fill="#78716c"/>' + oog(56, 38.5, 1.6) + lijn("M54 43c2 1 4 1 6 0", D, 1)
  + poten([16, 24, 38, 46], 44, 54, "#78716c", 6)
  + '<path d="M6 44C6 26 18 16 30 16S54 26 54 44Z" fill="#a16207"/>'
  + lijn("M22 22l6 6-6 8-8-4M38 22l-6 6 6 8 8-4M28 28h4M22 36l2 8M38 36l-2 8M24 44h12", "#fcd34d", 1.6)
  + '<path d="M4 44H56" stroke="#713f12" stroke-width="3" stroke-linecap="round"/>')

P["zee_egel"] = (stekels(32, 34, 10, 29, 16, "#a855f7", 3.4) + stekels(32, 34, 10, 22, 16, "#d8b4fe", 1.3)
  + '<circle cx="32" cy="34" r="14" fill="#7e22ce"/>' + ring(32, 34, 8, 8, 1.6, "#d8b4fe") + '<circle cx="32" cy="34" r="2.5" fill="#d8b4fe"/>')

# Diepte voor alle picto's: een glimrandje linksboven en schaduw rechtsonder.
STICKER = ('<filter id="st" x="-10%" y="-10%" width="120%" height="120%">'
  '<feOffset in="SourceAlpha" dx="-1.4" dy="-1.8" result="o1"/><feComposite in="SourceAlpha" in2="o1" operator="out" result="r1"/>'
  '<feFlood flood-color="#000" flood-opacity=".3"/><feComposite in2="r1" operator="in" result="schaduw"/>'
  '<feOffset in="SourceAlpha" dx="1.2" dy="1.5" result="o2"/><feComposite in="SourceAlpha" in2="o2" operator="out" result="r2"/>'
  '<feFlood flood-color="#fff" flood-opacity=".35"/><feComposite in2="r2" operator="in" result="glim"/>'
  '<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="schaduw"/><feMergeNode in="glim"/></feMerge></filter>')

def svg(k):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 66 66">{STICKER}<g filter="url(#st)">{P[k]}</g></svg>'

def uri(k):
    return "data:image/svg+xml;charset=utf-8," + urllib.parse.quote(svg(k), safe=" =:/;,().-")

def bestanden():
    return sorted(glob.glob(os.path.join(PUBLIC, "dictees", "dictee-*.html")))

if __name__ == "__main__":
    ids = re.findall(r'\{id:"([a-z_]+)"', open(bestanden()[0], encoding="utf-8").read())
    ontbreekt = [i for i in ids if i not in P]
    assert not ontbreekt, ontbreekt
    if sys.argv[1:] == ["voorbeeld"]:
        kaart = "".join(f'<figure><img src="{uri(k)}"><figcaption>{k}</figcaption></figure>' for k in ids)
        open(os.path.join(PUBLIC, "_picto-voorbeeld.html"), "w", encoding="utf-8").write(
            '<!doctype html><meta charset="utf-8"><style>body{background:#0d0d1a;color:#ccc;font:12px sans-serif;display:flex;flex-wrap:wrap;gap:6px;margin:8px}'
            'figure{margin:0;width:88px;text-align:center}img{width:64px;height:64px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.5))}'
            'figure:nth-child(-n+0){}</style>' + kaart)
    else:
        blok = "const IMAGES = {" + ", ".join(f'"{k}": "{uri(k)}"' for k in ids) + "};"
        for f in bestanden():
            t = open(f, encoding="utf-8").read()
            t, n = re.subn(r"const IMAGES = \{.*?\};", lambda m: blok, t, count=1, flags=re.S)
            assert n == 1, f
            open(f, "w", encoding="utf-8", newline="").write(t)
            print(os.path.basename(f))
