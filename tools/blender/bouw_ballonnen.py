# Ballonnengevecht-arena voor Blender (draaien in Blender: exec(open(pad).read())).
# De vorm volgt EXACT de constanten uit src/games/BotsenGame.jsx (die ook op de
# server staan): platforms, bruggen, hellingen, leuningen, bumpers. Spel-x = x,
# spel-z = -Blender-y (glTF-omzetting), dus overal y = -z.
import bpy, bmesh, math, random
from mathutils import Vector, Matrix
random.seed(5)

ARENA_HALF = 58; PLAT_H = 4.2; PLAT_SIZE = 22; CORRIDOR = 20; BRIDGE_W = 8
OFF = PLAT_SIZE / 2 + CORRIDOR / 2; RAMP_LEN = 14
HP = PLAT_SIZE / 2; HB = BRIDGE_W / 2; HC = CORRIDOR / 2
QUADS = [  # (key, spel-x, spel-z, team, rampDir)
    ('nw', -OFF, -OFF, 'blauw', -1), ('ne', OFF, -OFF, 'rood', 1),
    ('sw', -OFF, OFF, 'groen', -1), ('se', OFF, OFF, 'geel', 1)]
DIAG = OFF + HP + 5

sc = bpy.data.scenes.get('ballonnen') or bpy.data.scenes.new('ballonnen')
bpy.context.window.scene = sc
for o in list(sc.objects): bpy.data.objects.remove(o, do_unlink=True)
COL = bpy.data.collections.get('arena') or bpy.data.collections.new('arena')
if COL.name not in sc.collection.children: sc.collection.children.link(COL)
LCOL = bpy.data.collections.get('arena_licht') or bpy.data.collections.new('arena_licht')
if LCOL.name not in sc.collection.children: sc.collection.children.link(LCOL)

def mat(naam, kleur=(0.7, 0.7, 0.7), emis=0.0):
    m = bpy.data.materials.get(naam) or bpy.data.materials.new(naam)
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*kleur, 1)
    b.inputs['Roughness'].default_value = 0.7
    b.inputs['Emission Strength'].default_value = emis
    if emis: b.inputs['Emission Color'].default_value = (*kleur, 1)
    return m

TEAM = {'blauw': (0.1, 0.9, 1.0), 'rood': (1.0, 0.18, 0.43), 'groen': (0.22, 1.0, 0.53), 'geel': (1.0, 0.76, 0.1)}
PANEEL = {'blauw': (0.3, 0.5, 0.84), 'rood': (0.83, 0.32, 0.36), 'groen': (0.27, 0.75, 0.49), 'geel': (0.89, 0.7, 0.23)}
M = {'ground_asfalt': mat('ground_asfalt', (0.25, 0.26, 0.28)), 'verf_wit': mat('verf_wit', (0.9, 0.92, 0.95)),
     'verf_geel': mat('verf_geel', (1.0, 0.82, 0.25)), 'dek': mat('dek', (0.6, 0.62, 0.66)),
     'paneel': mat('paneel', (0.5, 0.53, 0.58)), 'staal': mat('staal', (0.3, 0.32, 0.36)),
     'gebouw': mat('gebouw', (0.08, 0.09, 0.12), emis=0.6), 'dak': mat('dak', (0.08, 0.09, 0.11)),
     'neon_roze': mat('neon_roze', (1.0, 0.18, 0.56), emis=8), 'neon_paars': mat('neon_paars', (0.7, 0.53, 1.0), emis=8),
     'lamp_wit': mat('lamp_wit', (1.0, 0.96, 0.88), emis=30)}
for t, k in TEAM.items():
    M['neon_' + t] = mat('neon_' + t, k, emis=8)
    M['paneel_' + t] = mat('paneel_' + t, PANEEL[t])
BUMPER = [(0.61, 0.36, 0.9), (0.96, 0.64, 0.38), (0.26, 0.67, 0.55), (1.0, 0.42, 0.62)]
for i, k in enumerate(BUMPER):
    M[f'bumper_{i}'] = mat(f'bumper_{i}', k); M[f'bumperneon_{i}'] = mat(f'bumperneon_{i}', k, emis=8)

class Bouw:
    def __init__(s, naam): s.naam = naam; s.bm = bmesh.new(); s.mats = []
    def mi(s, m):
        if m not in s.mats: s.mats.append(m)
        return s.mats.index(m)
    def _zet(s, verts, m):
        i = s.mi(m)
        for f in {f for v in verts for f in v.link_faces}: f.material_index = i
    def doos(s, c, sz, m, rot=None):
        r = bmesh.ops.create_cube(s.bm, size=1)
        T = Matrix.Translation(c) @ (rot or Matrix.Identity(4)) @ Matrix.Diagonal((*sz, 1))
        bmesh.ops.transform(s.bm, matrix=T, verts=r['verts']); s._zet(r['verts'], m)
    def cil(s, c, r, h, m, seg=24, r2=None):
        res = bmesh.ops.create_cone(s.bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h)
        bmesh.ops.translate(s.bm, vec=Vector(c), verts=res['verts']); s._zet(res['verts'], m)
    def quad(s, pts, m):
        f = s.bm.faces.new([s.bm.verts.new(p) for p in pts]); f.material_index = s.mi(m)
    def klaar(s):
        me = bpy.data.meshes.new(s.naam); s.bm.to_mesh(me); s.bm.free()
        for m in s.mats: me.materials.append(M[m])
        o = bpy.data.objects.new(s.naam, me); COL.objects.link(o); return o

def P(x, z, y=0.0): return Vector((x, -z, y))   # spel-coördinaten → Blender

# ── vloer + verf ──
v = Bouw('floor'); v.quad([P(-ARENA_HALF - 3, ARENA_HALF + 3), P(ARENA_HALF + 3, ARENA_HALF + 3), P(ARENA_HALF + 3, -ARENA_HALF - 3), P(-ARENA_HALF - 3, -ARENA_HALF - 3)], 'ground_asfalt'); v.klaar()
verf = Bouw('verf')
def lijn(x0, z0, x1, z1, b, m='verf_wit'):
    d = Vector((x1 - x0, z1 - z0)); n = Vector((-d.y, d.x)).normalized() * b / 2
    verf.quad([P(x0 - n.x, z0 - n.y, 0.02), P(x1 - n.x, z1 - n.y, 0.02), P(x1 + n.x, z1 + n.y, 0.02), P(x0 + n.x, z0 + n.y, 0.02)][::-1], m)
# middencirkel (onder de bruggen door bereikbaar) + stippellijnen naar de hoeken
N = 48
for i in range(N):
    a0, a1 = 2 * math.pi * i / N, 2 * math.pi * (i + 1) / N
    for r, b, m in ((7.0, 0.35, 'verf_wit'), (5.2, 0.25, 'verf_geel')):
        lijn(r * math.cos(a0), r * math.sin(a0), r * math.cos(a1), r * math.sin(a1), b, m)
for sx in (-1, 1):
    for sz in (-1, 1):
        for k in range(6):
            t0 = 9 + k * 4.2
            lijn(sx * t0 * 0.7071, sz * t0 * 0.7071, sx * (t0 + 2.2) * 0.7071, sz * (t0 + 2.2) * 0.7071, 0.4, 'verf_geel')
# rand-lijn langs de buitengrens
for s in (-1, 1):
    lijn(-ARENA_HALF + 1, s * (ARENA_HALF - 1), ARENA_HALF - 1, s * (ARENA_HALF - 1), 0.4)
    lijn(s * (ARENA_HALF - 1), -ARENA_HALF + 1, s * (ARENA_HALF - 1), ARENA_HALF - 1, 0.4)
verf.klaar()

# ── platforms ──
def wanden(q):  # zelfde segmenten als platformWalls() in BotsenGame.jsx
    _, x, z, _, rd = q
    top = z < 0
    outerZ = z - HP if top else z + HP
    innerZ = z + HP if top else z - HP
    rampX0 = x + rd * HP; innerX = x - rd * HP
    railMidX = rampX0 + rd * (RAMP_LEN / 2)
    flankLen = HP - HB; flankOff = HB + flankLen / 2
    return [(x, outerZ, HP, 0.4, 'vlak'), (railMidX, z - HP, RAMP_LEN / 2, 0.4, 'helling'), (railMidX, z + HP, RAMP_LEN / 2, 0.4, 'helling'),
            (x - flankOff, innerZ, flankLen / 2, 0.4, 'vlak'), (x + flankOff, innerZ, flankLen / 2, 0.4, 'vlak'),
            (innerX, z - flankOff, 0.4, flankLen / 2, 'vlak'), (innerX, z + flankOff, 0.4, flankLen / 2, 'vlak')]

for q in QUADS:
    key, x, z, team, rd = q
    b = Bouw('platform_' + key)
    # romp: gekleurde panelen met een donkere sokkel en neonband
    b.doos(P(x, z, PLAT_H / 2), (PLAT_SIZE, PLAT_SIZE, PLAT_H), 'paneel_' + team)
    b.doos(P(x, z, 0.35), (PLAT_SIZE + 0.3, PLAT_SIZE + 0.3, 0.7), 'staal')
    b.doos(P(x, z, PLAT_H - 0.55), (PLAT_SIZE + 0.12, PLAT_SIZE + 0.12, 0.22), 'neon_' + team)
    # dek met een gekleurde rand en een groot rond "doel"-vlak in het midden
    b.doos(P(x, z, PLAT_H + 0.01), (PLAT_SIZE - 0.2, PLAT_SIZE - 0.2, 0.02), 'dek')
    for i in range(32):
        a0, a1 = 2 * math.pi * i / 32, 2 * math.pi * (i + 1) / 32
        for r, br in ((6.0, 0.4),):
            c0 = P(x + r * math.cos(a0), z + r * math.sin(a0), PLAT_H + 0.03); c1 = P(x + r * math.cos(a1), z + r * math.sin(a1), PLAT_H + 0.03)
            d = (c1 - c0); n = Vector((-d.y, d.x, 0)).normalized() * br / 2
            b.quad([c0 - n, c1 - n, c1 + n, c0 + n], 'verf_wit')
    # verticale lichtstrepen op de zijkanten
    for k in range(-3, 4):
        for zz in (z - HP - 0.06, z + HP + 0.06):
            b.doos(P(x + k * 3.0, zz, PLAT_H * 0.45), (0.25, 0.08, PLAT_H * 0.55), 'neon_' + team)
    b.klaar()
    # helling: schuin vlak van PLAT_H naar 0 over RAMP_LEN, met pijlen
    h = Bouw('helling_' + key)
    x0 = x + rd * HP; x1 = x0 + rd * RAMP_LEN
    zs = (z - HP, z + HP)
    top = [P(x0, zs[0], PLAT_H), P(x0, zs[1], PLAT_H), P(x1, zs[1], 0.02), P(x1, zs[0], 0.02)]
    bodem = [P(x0, zs[0], 0), P(x0, zs[1], 0)]
    h.quad(top if rd > 0 else top[::-1], 'dek')
    h.quad([top[0], top[3], bodem[0]] if rd > 0 else [top[0], bodem[0], top[3]], 'paneel_' + team)
    h.quad([top[1], bodem[1], top[2]] if rd > 0 else [top[1], top[2], bodem[1]], 'paneel_' + team)
    h.quad([bodem[0], bodem[1], top[1], top[0]] if rd > 0 else [top[0], top[1], bodem[1], bodem[0]], 'paneel_' + team)
    for k in range(3):   # chevrons die de helling op wijzen
        t = 0.25 + k * 0.25; xc = x0 + rd * RAMP_LEN * t; hgt = PLAT_H * (1 - t) + 0.06
        for s in (-1, 1):
            a = P(xc - rd * 1.2, z + s * 3.2, hgt - PLAT_H * (-1.2 / RAMP_LEN)); c = P(xc, z, hgt)
            d = (c - a); n = Vector((-d.y, d.x, 0)).normalized() * 0.45
            h.quad([a - n, c - n, c + n, a + n] if (rd * s) > 0 else [a + n, c + n, c - n, a - n], 'neon_' + team)
    h.klaar()
    # leuningen precies op de botsingswanden
    r = Bouw('leuning_' + key)
    for (wx, wz, hw, hd, soort) in wanden(q):
        lang = max(hw, hd) * 2 * 0.95
        langs_x = hw > hd
        if soort == 'helling':
            # schuine leuning die de helling volgt
            xa, xb = wx - hw, wx + hw
            ya = PLAT_H * (1 - (abs(xa - x0)) / RAMP_LEN); yb = PLAT_H * (1 - (abs(xb - x0)) / RAMP_LEN)
            for dy, m, dik in ((0.45, 'staal', 0.25), (0.92, 'neon_' + team, 0.18)):
                a = P(xa, wz, ya + dy); c = P(xb, wz, yb + dy)
                mid = (a + c) / 2; L = (c - a).length; hoek = math.atan2(c.z - a.z, c.x - a.x)
                r.doos(mid, (L, dik, dik), m, Matrix.Rotation(-hoek, 4, 'Y'))
        else:
            r.doos(P(wx, wz, PLAT_H + 0.45), (lang if langs_x else 0.3, 0.3 if langs_x else lang, 0.9), 'staal')
            r.doos(P(wx, wz, PLAT_H + 0.95), (lang if langs_x else 0.22, 0.22 if langs_x else lang, 0.14), 'neon_' + team)
    r.klaar()

# ── bruggen: stalen dek met vakwerk-zijkanten en twee poten ──
for i, (bx, bz, hor) in enumerate([(0, -OFF, True), (0, OFF, True), (-OFF, 0, False), (OFF, 0, False)]):
    b = Bouw(f'brug_{i}')
    w, d = (CORRIDOR, BRIDGE_W) if hor else (BRIDGE_W, CORRIDOR)
    b.doos(P(bx, bz, PLAT_H - 0.3), (w, d, 0.6), 'staal')
    b.doos(P(bx, bz, PLAT_H + 0.01), (w - 0.1, d - 0.1, 0.02), 'dek')
    for off in (-HB, HB):
        ox, oz = (0, off) if hor else (off, 0)
        b.doos(P(bx + ox, bz + oz, PLAT_H + 0.4), (CORRIDOR * 0.97 if hor else 0.25, 0.25 if hor else CORRIDOR * 0.97, 0.12), 'neon_paars')
        for k in range(9):   # spijlen
            t = -HC + 1 + k * (CORRIDOR - 2) / 8
            px, pz = (bx + t, bz + oz) if hor else (bx + ox, bz + t)
            b.doos(P(px, pz, PLAT_H + 0.2), (0.12, 0.12, 0.4), 'staal')
    for off in (-CORRIDOR / 4, CORRIDOR / 4):
        px, pz = (bx + off, bz) if hor else (bx, bz + off)
        b.cil(P(px, pz, PLAT_H / 2 - 0.3), 0.35, PLAT_H - 0.6, 'staal', seg=12)
    b.klaar()

# ── bumpers in de hoeken (cilinder d=6, h=2,6) ──
for i, (sx, sz) in enumerate([(-1, -1), (1, -1), (-1, 1), (1, 1)]):
    b = Bouw(f'bumper_{i}')
    b.cil(P(sx * DIAG, sz * DIAG, 1.3), 3.0, 2.6, f'bumper_{i}', seg=32)
    b.cil(P(sx * DIAG, sz * DIAG, 2.62), 2.6, 0.08, f'bumperneon_{i}', seg=32)
    b.cil(P(sx * DIAG, sz * DIAG, 1.3), 3.06, 0.3, f'bumperneon_{i}', seg=32)
    b.cil(P(sx * DIAG, sz * DIAG, 0.18), 3.4, 0.36, 'staal', seg=32)
    b.klaar()

# ── rand van de arena + lichtmasten in de hoeken ──
b = Bouw('rand')
T = 2.2; H = 1.6
for s in (-1, 1):
    b.doos(P(0, s * (ARENA_HALF + T / 2), H / 2 - 0.3), (ARENA_HALF * 2 + T * 2, T, H), 'staal')
    b.doos(P(s * (ARENA_HALF + T / 2), 0, H / 2 - 0.3), (T, ARENA_HALF * 2 + T * 2, H), 'staal')
    b.doos(P(0, s * (ARENA_HALF + T / 2), H - 0.3), (ARENA_HALF * 2 + T * 2, T * 0.55, 0.18), 'neon_roze')
    b.doos(P(s * (ARENA_HALF + T / 2), 0, H - 0.3), (T * 0.55, ARENA_HALF * 2 + T * 2, 0.18), 'neon_roze')
b.klaar()
MASTEN = [(sx * (ARENA_HALF + 6), sz * (ARENA_HALF + 6)) for sx in (-1, 1) for sz in (-1, 1)]
for i, (mx, mz) in enumerate(MASTEN):
    b = Bouw(f'mast_{i}')
    b.cil(P(mx, mz, 12), 0.6, 24, 'staal', seg=10, r2=0.35)
    rich = Vector((-mx, mz, 0)).normalized()
    hoek = math.atan2(rich.y, rich.x)
    rot = Matrix.Rotation(hoek, 4, 'Z') @ Matrix.Rotation(math.radians(25), 4, 'Y')
    b.doos(P(mx, mz, 24.5), (0.6, 5.0, 3.0), 'staal', Matrix.Rotation(hoek, 4, 'Z'))
    for k in range(-2, 3):
        for j in (-1, 1):
            c = P(mx, mz, 24.5 + j * 0.7) + Vector((rich.x * 0.35, rich.y * 0.35, 0)) + Vector((-rich.y, rich.x, 0)) * k * 0.95
            b.doos(c, (0.1, 0.8, 0.55), 'lamp_wit', Matrix.Rotation(hoek, 4, 'Z'))
    b.klaar()

# ── skyline rondom (puur decor, ver buiten het speelveld) ──
for i in range(70):
    a = 2 * math.pi * i / 70 + random.uniform(-0.03, 0.03)
    r = random.uniform(95, 140)
    x, z = r * math.cos(a), r * math.sin(a)
    w, d, h = random.uniform(10, 22), random.uniform(10, 22), random.uniform(18, 70)
    b = Bouw(f'deco_gebouw_{i}')
    b.doos(P(x, z, h / 2), (w, d, h), 'gebouw', Matrix.Rotation(a, 4, 'Z'))
    b.doos(P(x, z, h + 0.3), (w + 0.4, d + 0.4, 0.6), 'dak', Matrix.Rotation(a, 4, 'Z'))
    if random.random() < 0.35:
        b.doos(P(x, z, h + 0.75), (w * 0.9, 0.3, 0.3), random.choice(['neon_roze', 'neon_paars', 'neon_blauw', 'neon_geel']), Matrix.Rotation(a, 4, 'Z'))
    b.klaar()

# ── UVMap in meters (wereldprojectie) ──
for o in COL.objects:
    bm = bmesh.new(); bm.from_mesh(o.data)
    uvl = bm.loops.layers.uv.get('UVMap') or bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for l in f.loops:
            co = o.matrix_world @ l.vert.co
            l[uvl].uv = (co.x, co.y) if ax == 2 else (co.y, co.z) if ax == 0 else (co.x, co.z)
    bm.to_mesh(o.data); bm.free()

# ── licht voor de bake ──
for o in list(LCOL.objects): bpy.data.objects.remove(o, do_unlink=True)
def licht(naam, soort, loc, kleur, kracht, r=0.3, rot=None):
    d = bpy.data.lights.new(naam, soort); d.color = kleur; d.energy = kracht
    if soort in ('POINT', 'SPOT'): d.shadow_soft_size = r
    if soort == 'SPOT': d.spot_size = math.radians(80); d.spot_blend = 0.6
    if soort == 'SUN': d.angle = math.radians(4)
    o = bpy.data.objects.new(naam, d); o.location = loc
    if rot: o.rotation_euler = rot
    LCOL.objects.link(o); return o
licht('maan', 'SUN', (0, 0, 50), (0.6, 0.7, 1.0), 1.2, rot=(math.radians(45), 0, math.radians(30)))
for i, (mx, mz) in enumerate(MASTEN):
    o = licht(f'schijnwerper_{i}', 'SPOT', P(mx, mz, 24), (1.0, 0.95, 0.88), 120000, 1.5)
    rich = (P(0, 0, 0) - o.location).normalized()
    o.rotation_euler = rich.to_track_quat('-Z', 'Y').to_euler()
for key, x, z, team, rd in QUADS:
    licht(f'team_{key}', 'POINT', P(x, z, PLAT_H + 3), TEAM[team], 2500, 1.0)
licht('midden', 'POINT', P(0, 0, 3), (0.7, 0.55, 1.0), 2000, 1.0)
w = sc.world or bpy.data.worlds.new('nacht_arena'); sc.world = w; w.use_nodes = True
bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND')
bg.inputs['Color'].default_value = (0.04, 0.035, 0.1, 1); bg.inputs['Strength'].default_value = 2.0
print('arena gebouwd:', len(COL.objects), 'objecten')
