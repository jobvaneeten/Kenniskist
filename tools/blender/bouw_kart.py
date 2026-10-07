# Kart voor Ballonnengevecht (draaien in Blender: exec(open(pad).read())).
# Gebouwd rond het poppetje in de rijhouding uit public/rijden.glb (alleen
# rotaties, zoals in het spel: heupen op rusthoogte). Het poppetje staat in
# het spel op AV_Y = -0.12, dus hier ook 0.12 omlaag. Vooruit = -y.
#   handen ±0.2, y -0.46, z ~0.99   → stuur
#   heupen z 0.67, voeten z ~0.12 op y -0.15..-0.55 → onderbenen verdwijnen in de neus
# Materialen worden in het spel op naam vervangen (kartShared.js):
#   lak (teamkleur), lak_donker, zwart, chroom, band, stoel, neon (teamkleur, gloeit),
#   koplamp, achterlicht. Wielen zijn losse objecten 'wiel_*' (oorsprong = naaf).
import bpy, bmesh, math
from mathutils import Vector, Matrix

sc = bpy.data.scenes['kart']; bpy.context.window.scene = sc
COL = bpy.data.collections.get('kart') or bpy.data.collections.new('kart')
if COL.name not in sc.collection.children: sc.collection.children.link(COL)
for o in list(COL.objects): bpy.data.objects.remove(o, do_unlink=True)
arm = bpy.data.objects.get('Skeleton')
if arm: arm.location.z = -0.12

def mat(naam, kleur, metaal=0.0, ruw=0.5, emis=0.0):
    m = bpy.data.materials.get(naam) or bpy.data.materials.new(naam); m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*kleur, 1); b.inputs['Metallic'].default_value = metaal
    b.inputs['Roughness'].default_value = ruw; b.inputs['Emission Strength'].default_value = emis
    if emis: b.inputs['Emission Color'].default_value = (*kleur, 1)
    return m
M = {'lak': mat('lak', (0.8, 0.1, 0.12), 0.2, 0.25), 'lak_donker': mat('lak_donker', (0.35, 0.05, 0.06), 0.2, 0.35),
     'zwart': mat('zwart', (0.03, 0.03, 0.035), 0, 0.6), 'chroom': mat('chroom', (0.9, 0.9, 0.92), 1, 0.15),
     'band': mat('band', (0.02, 0.02, 0.02), 0, 0.85), 'stoel': mat('stoel', (0.06, 0.06, 0.07), 0, 0.7),
     'neon': mat('neon', (1, 0.2, 0.3), 0, 0.3, 5), 'koplamp': mat('koplamp', (1, 0.95, 0.85), 0, 0.2, 8),
     'achterlicht': mat('achterlicht', (1, 0.05, 0.05), 0, 0.2, 5)}

class Bouw:
    def __init__(s, naam): s.naam = naam; s.bm = bmesh.new(); s.mats = []
    def mi(s, m):
        if m not in s.mats: s.mats.append(m)
        return s.mats.index(m)
    def _mat(s, verts, m):
        i = s.mi(m)
        for f in {f for v in verts for f in v.link_faces}: f.material_index = i
    def doos(s, mn, mx, m, bevel=0.03, vorm=None):
        """as-uitgelijnde doos van mn tot mx; vorm(v) mag vertices verschuiven (wig/taps)."""
        r = bmesh.ops.create_cube(s.bm, size=1)
        c = (Vector(mn) + Vector(mx)) / 2; d = Vector(mx) - Vector(mn)
        bmesh.ops.transform(s.bm, matrix=Matrix.Translation(c) @ Matrix.Diagonal((*d, 1)), verts=r['verts'])
        if vorm:
            for v in r['verts']: vorm(v)
        if bevel:
            edges = list({e for v in r['verts'] for e in v.link_edges})
            res = bmesh.ops.bevel(s.bm, geom=r['verts'] + edges, offset=bevel, segments=3, affect='EDGES', profile=0.5)
            alle = set(r['verts']) | set(res.get('verts', []))
            s._mat([v for v in alle if v.is_valid], m)
        else: s._mat(r['verts'], m)
    def cil(s, c, r, l, m, as_='x', seg=24, r2=None, rot=None):
        res = bmesh.ops.create_cone(s.bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=l)
        R = {'x': Matrix.Rotation(math.pi / 2, 4, 'Y'), 'y': Matrix.Rotation(math.pi / 2, 4, 'X'), 'z': Matrix.Identity(4)}[as_]
        if rot: R = rot @ R
        bmesh.ops.transform(s.bm, matrix=Matrix.Translation(c) @ R, verts=res['verts']); s._mat(res['verts'], m)
    def torus(s, c, R_, r, m, rot, seg=32, ring=10):
        verts = []
        rings = []
        for i in range(seg):
            a = 2 * math.pi * i / seg; ring_v = []
            for j in range(ring):
                b = 2 * math.pi * j / ring
                p = Vector(((R_ + r * math.cos(b)) * math.cos(a), (R_ + r * math.cos(b)) * math.sin(a), r * math.sin(b)))
                ring_v.append(s.bm.verts.new(Vector(c) + rot @ p))
            rings.append(ring_v); verts += ring_v
        for i in range(seg):
            for j in range(ring):
                a, b = rings[i], rings[(i + 1) % seg]
                s.bm.faces.new((a[j], b[j], b[(j + 1) % ring], a[(j + 1) % ring]))
        s._mat(verts, m)
    def klaar(s, oorsprong=(0, 0, 0)):
        bmesh.ops.recalc_face_normals(s.bm, faces=s.bm.faces)
        me = bpy.data.meshes.new(s.naam); s.bm.to_mesh(me); s.bm.free()
        for m in s.mats: me.materials.append(M[m])
        for p in me.polygons: p.use_smooth = True
        o = bpy.data.objects.new(s.naam, me); COL.objects.link(o)
        if any(oorsprong):
            me.transform(Matrix.Translation(-Vector(oorsprong))); o.location = oorsprong
        return o

k = Bouw('kart_body')
# bodemplaat (onder de voeten: bovenkant 0.10)
k.doos((-0.5, -1.3, 0.04), (0.5, 0.9, 0.10), 'zwart', bevel=0.02)
# neus: tunnel over de onderbenen, aflopend naar voren
def neusvorm(v):
    if v.co.z > 0.3 and v.co.y < -1.0: v.co.z -= 0.28        # voorkant omlaag
    if v.co.y < -1.0: v.co.x *= 0.8                          # smaller naar voren
k.doos((-0.42, -1.42, 0.1), (0.42, -0.5, 0.78), 'lak', bevel=0.09, vorm=neusvorm)
k.doos((-0.28, -1.0, 0.76), (0.28, -0.52, 0.82), 'lak_donker', bevel=0.03)              # motorkap-streep
# dashboard + stuurkolom
k.doos((-0.36, -0.62, 0.74), (0.36, -0.5, 0.86), 'zwart', bevel=0.03)
stuur = Vector((-0.03, -0.45, 0.99)); kant = Matrix.Rotation(math.radians(-62), 4, 'X')   # stuur kantelt naar de bestuurder
k.torus(stuur, 0.2, 0.025, 'zwart', kant)
k.cil(stuur, 0.05, 0.05, 'chroom', as_='z', rot=kant, seg=12)
for a in (0, 2.1, 4.2):   # spaken
    d = kant @ Vector((math.cos(a) * 0.1, math.sin(a) * 0.1, 0))
    k.cil(stuur + d, 0.015, 0.2, 'chroom', as_='x', seg=6, rot=kant @ Matrix.Rotation(a, 4, 'Z'))
k.cil((-0.03, -0.53, 0.86), 0.025, 0.28, 'chroom', as_='z', seg=8, rot=Matrix.Rotation(math.radians(-62), 4, 'X'))
# zijbakken langs de bestuurder
X = lambda sx, a, b: (min(sx * a, sx * b), max(sx * a, sx * b))
for sx in (-1, 1):
    x0, x1 = X(sx, 0.36, 0.62); k.doos((x0, -0.55, 0.1), (x1, 0.75, 0.5), 'lak', bevel=0.08)
    x0, x1 = X(sx, 0.6, 0.64); k.doos((x0, -0.45, 0.16), (x1, 0.6, 0.22), 'neon', bevel=0)        # neonstrip
    x0, x1 = X(sx, 0.36, 0.5); k.doos((x0, -0.4, 0.5), (x1, 0.55, 0.56), 'lak_donker', bevel=0.02)
# kuipstoel
k.doos((-0.3, -0.12, 0.42), (0.3, 0.3, 0.56), 'stoel', bevel=0.05)
def leuning(v):
    if v.co.z > 0.8: v.co.y += 0.1                            # schuin naar achter
k.doos((-0.3, 0.22, 0.5), (0.3, 0.36, 1.08), 'stoel', bevel=0.06, vorm=leuning)
for sx in (-1, 1): x0, x1 = X(sx, 0.26, 0.34); k.doos((x0, -0.05, 0.5), (x1, 0.32, 0.8), 'stoel', bevel=0.04)
# motorblok + uitlaten achter de stoel
k.doos((-0.34, 0.4, 0.1), (0.34, 0.95, 0.52), 'lak_donker', bevel=0.06)
k.doos((-0.26, 0.5, 0.52), (0.26, 0.85, 0.66), 'chroom', bevel=0.03)
for x in (-0.16, 0, 0.16): k.cil((x, 0.68, 0.7), 0.035, 0.08, 'chroom', as_='z', seg=10)
for sx in (-0.2, 0.2):
    k.cil((sx, 1.02, 0.4), 0.07, 0.3, 'chroom', as_='y', seg=14, r2=0.09)
    k.cil((sx, 1.18, 0.4), 0.05, 0.02, 'zwart', as_='y', seg=14)
# achterspoiler
for sx in (-0.42, 0.42): k.doos((sx - 0.03, 0.85, 0.5), (sx + 0.03, 0.95, 1.02), 'zwart', bevel=0.01)
k.doos((-0.62, 0.78, 1.0), (0.62, 1.1, 1.06), 'lak', bevel=0.02)
for sx in (-0.62, 0.62): k.doos((sx - 0.02, 0.76, 0.9), (sx + 0.02, 1.12, 1.12), 'lak_donker', bevel=0.01)
# bumpers + lichten
k.doos((-0.5, -1.56, 0.12), (0.5, -1.44, 0.26), 'zwart', bevel=0.04)
k.doos((-0.3, -1.575, 0.17), (0.3, -1.555, 0.21), 'neon', bevel=0)
for sx in (-0.24, 0.24):
    k.cil((sx, -1.43, 0.36), 0.075, 0.06, 'chroom', as_='y', seg=16)
    k.cil((sx, -1.465, 0.36), 0.06, 0.02, 'koplamp', as_='y', seg=16)
k.doos((-0.5, 0.95, 0.12), (0.5, 1.08, 0.3), 'zwart', bevel=0.04)
for sx in (-0.36, 0.36): k.doos((sx - 0.1, 1.08, 0.2), (sx + 0.1, 1.1, 0.27), 'achterlicht', bevel=0)
# wielophanging (assen)
k.cil((0, -0.95, 0.3), 0.04, 1.4, 'chroom', as_='x', seg=8)
k.cil((0, 0.72, 0.36), 0.045, 1.5, 'chroom', as_='x', seg=8)
k.klaar()

# wielen: band (afgerond) + velg + naafdop in lakkleur
def wiel(naam, c, r, br):
    w = Bouw(naam)
    w.torus(c, r - br * 0.5, br * 0.5, 'band', Matrix.Rotation(math.pi / 2, 4, 'Y'), seg=28, ring=10)
    w.cil(c, r - br * 0.45, br * 0.9, 'band', as_='x', seg=28)
    w.cil(c, r * 0.62, br * 0.95, 'chroom', as_='x', seg=20)
    for sx in (-1, 1):
        w.cil(Vector(c) + Vector((sx * br * 0.48, 0, 0)), r * 0.25, 0.03, 'lak', as_='x', seg=16)
        for i in range(5):
            a = i * 2 * math.pi / 5
            w.doos(Vector(c) + Vector((sx * br * 0.47 - 0.01, math.cos(a) * r * 0.42 - 0.02, math.sin(a) * r * 0.42 - 0.02)),
                   Vector(c) + Vector((sx * br * 0.47 + 0.01, math.cos(a) * r * 0.42 + 0.02, math.sin(a) * r * 0.42 + 0.02)), 'zwart', bevel=0)
    return w.klaar(oorsprong=c)
for x, nm in ((-0.72, 'l'), (0.72, 'r')):
    wiel(f'wiel_{nm}v', (x, -0.95, 0.3), 0.3, 0.3)
    wiel(f'wiel_{nm}a', (x * 1.03, 0.72, 0.36), 0.36, 0.38)
print('kart:', [o.name for o in COL.objects], sum(len(o.data.polygons) for o in COL.objects), 'vlakken')
