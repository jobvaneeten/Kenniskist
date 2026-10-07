# Paintball 'Industrieterrein' voor Blender (draaien in Blender: exec(open(pad).read())).
# Nieuwe, puntsymmetrische indeling binnen dezelfde maten als de server kent
# (ax 25, az 50, spawns op z = ±47, x tussen -5.25 en 5.25). Spel-x = x,
# spel-z = -Blender-y (glTF-omzetting), dus overal P(x, z, hoogte).
import bpy, bmesh, math, random
from mathutils import Vector, Matrix
random.seed(21)
AX, AZ = 25, 50
AZM = AZ + 4   # achtermuren staan verder weg: de camera hangt ~6 m achter de spawn (z = ±47)

sc = bpy.data.scenes.get('paintball_stad') or bpy.data.scenes.new('paintball_stad')
bpy.context.window.scene = sc
for o in list(sc.objects): bpy.data.objects.remove(o, do_unlink=True)
for c in list(sc.collection.children): sc.collection.children.unlink(c)
COL = bpy.data.collections.get('stad') or bpy.data.collections.new('stad')
if COL.name not in sc.collection.children: sc.collection.children.link(COL)
LCOL = bpy.data.collections.get('stad_licht') or bpy.data.collections.new('stad_licht')
if LCOL.name not in sc.collection.children: sc.collection.children.link(LCOL)

def mat(naam, kleur, emis=0.0):
    m = bpy.data.materials.get(naam) or bpy.data.materials.new(naam)
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*kleur, 1)
    b.inputs['Roughness'].default_value = 0.85
    b.inputs['Emission Strength'].default_value = emis
    if emis: b.inputs['Emission Color'].default_value = (*kleur, 1)
    return m

CONT = {'rood': (0.55, 0.12, 0.1), 'blauw': (0.1, 0.25, 0.55), 'groen': (0.14, 0.38, 0.22), 'oranje': (0.75, 0.35, 0.08)}
TEAM = {'rood': (1.0, 0.2, 0.25), 'blauw': (0.23, 0.48, 1.0)}
M = {'asfalt': mat('asfalt', (0.12, 0.12, 0.13)), 'beton': mat('beton', (0.42, 0.42, 0.42)),
     'muur': mat('muur', (0.35, 0.35, 0.36)), 'staal': mat('staal', (0.32, 0.34, 0.37)),
     'staal_geel': mat('staal_geel', (0.85, 0.62, 0.08)), 'hout': mat('hout', (0.45, 0.32, 0.2)),
     'tank': mat('tank', (0.7, 0.72, 0.74)), 'gevaar': mat('gevaar', (0.5, 0.4, 0.05)),
     'verf_geel': mat('verf_geel', (0.9, 0.7, 0.1)), 'verf_wit': mat('verf_wit', (0.85, 0.85, 0.85)),
     'dakplaat': mat('dakplaat', (0.25, 0.27, 0.3)),
     'gebouw': mat('gebouw', (0.06, 0.07, 0.09), emis=0.5), 'dak': mat('dak', (0.05, 0.05, 0.06)),
     'lamp_natrium': mat('lamp_natrium', (1.0, 0.66, 0.32), emis=40), 'tl_wit': mat('tl_wit', (0.85, 0.93, 1.0), emis=30)}
for k, c in CONT.items(): M['container_' + k] = mat('container_' + k, c)
for k, c in TEAM.items(): M['team_' + k] = mat('team_' + k, c, emis=8)

class Bouw:
    def __init__(s, naam): s.naam = naam; s.bm = bmesh.new(); s.mats = []
    def mi(s, m):
        if m not in s.mats: s.mats.append(m)
        return s.mats.index(m)
    def _zet(s, verts, m):
        i = s.mi(m)
        for f in {f for v in verts for f in v.link_faces}: f.material_index = i
    def doos(s, c, sz, m):
        r = bmesh.ops.create_cube(s.bm, size=1)
        bmesh.ops.transform(s.bm, matrix=Matrix.Translation(c) @ Matrix.Diagonal((*sz, 1)), verts=r['verts']); s._zet(r['verts'], m)
    def cil(s, c, r, l, m, as_='y', seg=16):
        res = bmesh.ops.create_cone(s.bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=l)
        rot = Matrix.Rotation(math.pi / 2, 4, 'X') if as_ == 'y' else Matrix.Rotation(math.pi / 2, 4, 'Y') if as_ == 'x' else Matrix.Identity(4)
        bmesh.ops.transform(s.bm, matrix=Matrix.Translation(c) @ rot, verts=res['verts']); s._zet(res['verts'], m)
    def quad(s, pts, m):
        f = s.bm.faces.new([s.bm.verts.new(p) for p in pts]); f.material_index = s.mi(m)
        f.normal_update()
        if f.normal.z < 0: f.normal_flip()   # vloervlakken altijd naar boven
    def klaar(s):
        me = bpy.data.meshes.new(s.naam); s.bm.to_mesh(me); s.bm.free()
        for m in s.mats: me.materials.append(M[m])
        o = bpy.data.objects.new(s.naam, me); COL.objects.link(o); return o

def P(x, z, y=0.0): return Vector((x, -z, y))
teller = {}
def naam(n):
    teller[n] = teller.get(n, 0) + 1; return f'{n}_{teller[n]}'

# ── vloer + verf ──
v = Bouw('floor'); v.quad([P(-AX - 2, AZM + 2), P(AX + 2, AZM + 2), P(AX + 2, -AZM - 2), P(-AX - 2, -AZM - 2)], 'asfalt'); v.klaar()
verf = Bouw('deco_verf')
def streep(x0, z0, x1, z1, b, m):
    d = Vector((x1 - x0, z1 - z0)); n = Vector((-d.y, d.x)).normalized() * b / 2
    verf.quad([P(x0 - n.x, z0 - n.y, 0.012), P(x1 - n.x, z1 - n.y, 0.012), P(x1 + n.x, z1 + n.y, 0.012), P(x0 + n.x, z0 + n.y, 0.012)], m)
for sx in (-1, 1):
    for z in range(-40, 40, 4): streep(sx * 11, z, sx * 11, z + 2.2, 0.18, 'verf_geel')   # gestippelde rijbanen
for sz in (-1, 1):
    zz = sz * AZ
    streep(-8, zz - sz * 6.5, 8, zz - sz * 6.5, 0.7, 'gevaar')                                # gevaarstrook voor het spawnvak
    for a, b_ in ((-8, 8),): streep(a, zz - sz * 0.6, a, zz - sz * 6, 0.14, 'verf_wit'); streep(b_, zz - sz * 0.6, b_, zz - sz * 6, 0.14, 'verf_wit')
streep(-AX + 0.6, 0, AX - 0.6, 0, 0.2, 'verf_wit')                                               # middenlijn
verf.klaar()

# ── bouwstenen ──
def container(x, z, langs, laag, kleur):
    L, B, H = 6.06, 2.44, 2.59
    sx, sz = (L, B) if langs == 'x' else (B, L)
    o = Bouw(naam('container')); y = laag * H
    o.doos(P(x, z, y + H / 2), (sx - 0.08, sz - 0.08, H - 0.1), 'container_' + kleur)
    for cx in (-1, 1):
        for cz in (-1, 1):
            o.doos(P(x + cx * (sx / 2 - 0.08), z + cz * (sz / 2 - 0.08), y + H / 2), (0.17, 0.17, H), 'staal')
    for cz in (-1, 1):   # boven- en onderrails op de lange zijden
        for hy in (0.06, H - 0.06):
            if langs == 'x': o.doos(P(x, z + cz * (sz / 2 - 0.06), y + hy), (sx, 0.14, 0.12), 'staal')
            else: o.doos(P(x + cz * (sx / 2 - 0.06), z, y + hy), (0.14, sz, 0.12), 'staal')
    o.klaar()

def kratten(x, z, n, m='hout'):
    o = Bouw(naam('krat'))
    for i in range(n): o.doos(P(x, z, 0.6 + i * 1.2), (1.2, 1.2, 1.2), m)
    o.klaar()

def barrier(x, z, langs, lengte=3.0):
    o = Bouw(naam('barrier'))
    sx, sz = (lengte, 0.6) if langs == 'x' else (0.6, lengte)
    o.doos(P(x, z, 0.25), (sx, sz, 0.5), 'beton')
    o.doos(P(x, z, 0.75), ((sx if langs == 'x' else 0.32), (sz if langs == 'z' else 0.32), 0.5), 'beton')
    o.doos(P(x, z, 0.9), ((sx + 0.01 if langs == 'x' else 0.34), (sz + 0.01 if langs == 'z' else 0.34), 0.14), 'gevaar')
    o.klaar()

def tank(x, z):
    o = Bouw(naam('tank'))
    o.cil(P(x, z, 1.85), 1.45, 8.5, 'tank', as_='y', seg=20)
    for dz in (-2.8, 0, 2.8): o.doos(P(x, z + dz, 0.6), (2.4, 0.4, 1.2), 'staal_geel')
    o.doos(P(x, z, 3.4), (0.7, 1.2, 0.3), 'staal')
    o.klaar()

def mast(x, z, team=None):
    o = Bouw(naam('mast'))
    o.doos(P(x, z, 5.5), (0.35, 0.35, 11), 'staal')
    o.klaar()
    k = Bouw(naam('deco_mastkop'))
    k.doos(P(x, z, 11.1), (1.6, 0.5, 0.35), 'staal')
    k.doos(P(x, z, 10.9), (1.4, 0.4, 0.08), 'lamp_natrium')
    k.klaar()

# ── speelveld (helft z > 0, gespiegeld naar z < 0) ──
def helft(s):
    S = lambda x, z: (s * x, s * z)
    container(*S(17.5, 24), 'z', 0, 'rood' if s > 0 else 'blauw'); container(*S(17.5, 24), 'z', 1, 'oranje')
    container(*S(14.7, 24.6), 'z', 0, 'groen')
    container(*S(-9, 31), 'x', 0, 'oranje' if s > 0 else 'groen')
    container(*S(-16.5, 41.5), 'x', 0, 'blauw' if s > 0 else 'rood')
    container(*S(20.6, 40.5), 'z', 0, 'groen' if s > 0 else 'oranje')
    kratten(*S(5, 30), 2); kratten(*S(6.25, 30), 1); kratten(*S(5.6, 31.25), 1)
    kratten(*S(-20.5, 16), 2); kratten(*S(-20.5, 17.25), 1)
    kratten(*S(9.5, 15), 1)
    barrier(*S(-9, 40), 'x'); barrier(*S(9, 40), 'x'); barrier(*S(12, 8), 'z'); barrier(*S(-3, 18), 'x')
    barrier(*S(-14, 24), 'z'); barrier(*S(19.5, 11), 'z')
    kratten(*S(-9, 12), 2); kratten(*S(-10.25, 12), 1)
    tank(*S(-18.5, 5))
    for mz in (14, 36): mast(*S(AX - 0.9, mz)); mast(*S(-AX + 0.9, mz))
helft(1); helft(-1)

# midden: overkapping met kratten eronder (dak is decor: geen dekking)
for cx in (-7.5, 0, 7.5):
    for cz in (-5.5, 5.5):
        c = Bouw(naam('kolom')); c.doos(P(cx, cz, 2.6), (0.4, 0.4, 5.2), 'staal_geel'); c.klaar()
d = Bouw('deco_dak'); d.doos(P(0, 0, 5.35), (16.4, 12.4, 0.3), 'dakplaat')
for cz in (-2.5, 2.5): d.doos(P(0, cz, 5.17), (10, 0.18, 0.06), 'tl_wit')
d.klaar()
kratten(4.6, 2.0, 2); kratten(-4.6, -2.0, 2); kratten(-3, 3, 1); kratten(3, -3, 1)
container(0, 0, 'x', 0, 'blauw')   # midden-container: dekking en scheiding tussen de helften

# ── omheining: betonmuur rondom, met teamlampen op de achtermuren ──
for nm, c, sz in (('muur_o', P(AX + 0.35, 0, 1.4), (0.7, 2 * AZM + 1.4, 2.8)), ('muur_w', P(-AX - 0.35, 0, 1.4), (0.7, 2 * AZM + 1.4, 2.8)),
                  ('muur_n', P(0, AZM + 0.35, 2), (2 * AX + 1.4, 0.7, 4)), ('muur_z', P(0, -AZM - 0.35, 2), (2 * AX + 1.4, 0.7, 4))):
    w = Bouw(nm); w.doos(c, sz, 'muur'); w.klaar()
for team, s in (('rood', 1), ('blauw', -1)):
    for x in (-8, 8):
        l = Bouw(naam('deco_teamlamp')); l.doos(P(x, s * (AZM - 0.1), 3.2), (1.4, 0.3, 0.3), 'team_' + team); l.klaar()

# ── skyline: loodsen en kantoren buiten de muur (alleen silhouet) ──
for i in range(40):
    a = random.uniform(0, 2 * math.pi)
    x, z = math.cos(a) * random.uniform(55, 120), math.sin(a) * random.uniform(75, 140)
    if abs(x) < AX + 12 and abs(z) < AZM + 12: continue
    w, dd, h = random.uniform(12, 30), random.uniform(10, 24), random.uniform(8, 28)
    b = Bouw(naam('deco_gebouw'))
    b.doos(P(x, z, h / 2), (w, dd, h), 'gebouw'); b.doos(P(x, z, h + 0.3), (w + 0.4, dd + 0.4, 0.6), 'dak')
    b.klaar()

# ── UVMap in meters (wereldprojectie) ──
for o in COL.objects:
    bm = bmesh.new(); bm.from_mesh(o.data)
    uvl = bm.loops.layers.uv.get('UVMap') or bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for l in f.loops:
            co = l.vert.co
            l[uvl].uv = (co.x, co.y) if ax == 2 else (co.y, co.z) if ax == 0 else (co.x, co.z)
    bm.to_mesh(o.data); bm.free()

# ── licht voor de bake ──
def licht(naam_, soort, loc, kleur, kracht, r=0.3, rot=None, kegel=None):
    d = bpy.data.lights.new(naam_, soort); d.color = kleur; d.energy = kracht
    if soort in ('POINT', 'SPOT'): d.shadow_soft_size = r
    if soort == 'SPOT': d.spot_size = math.radians(kegel or 110); d.spot_blend = 0.5
    if soort == 'SUN': d.angle = math.radians(3)
    o = bpy.data.objects.new(naam_, d); o.location = loc
    if rot: o.rotation_euler = rot
    LCOL.objects.link(o); return o
licht('maan', 'SUN', (0, 0, 40), (0.6, 0.68, 1.0), 0.45, rot=(math.radians(55), 0, math.radians(-30)))
for o in [o for o in COL.objects if o.name.startswith('deco_mastkop')]:
    c = sum((Vector(v.co) for v in o.data.vertices), Vector()) / len(o.data.vertices)
    sp = licht('mast_' + o.name[-2:], 'SPOT', (c.x, c.y, 10.7), (1.0, 0.7, 0.42), 16000, 0.5)
    doel = Vector((c.x * 0.25, c.y, 0)); sp.rotation_euler = (doel - sp.location).normalized().to_track_quat('-Z', 'Y').to_euler()
for cz in (-2.5, 2.5): licht(f'tl_{cz}', 'POINT', P(0, cz, 4.9), (0.85, 0.93, 1.0), 900, 1.2)
for team, s in (('rood', 1), ('blauw', -1)):
    for x in (-8, 8): licht(f'team_{team}_{x}', 'POINT', P(x, s * (AZM - 0.7), 3.2), TEAM[team], 1500, 0.4)
w = bpy.data.worlds.get('nacht_stad') or bpy.data.worlds.new('nacht_stad'); sc.world = w; w.use_nodes = True
bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND')
bg.inputs['Color'].default_value = (0.05, 0.035, 0.09, 1); bg.inputs['Strength'].default_value = 2.0
print('industrieterrein gebouwd:', len(COL.objects), 'objecten,', len(LCOL.objects), 'lampen')
