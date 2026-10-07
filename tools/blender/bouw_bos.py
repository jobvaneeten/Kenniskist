# Paintball 'Bos' voor Blender (draaien in Blender: exec(open(pad).read())).
# Neemt de bestaande indeling uit public/bos.glb over (zelfde dekking, zelfde
# ax/az/spawns), maar met nette materialen, wereld-UV's, lantaarns, een
# kampvuur en teamlampen voor de gebakken nachtbelichting.
import bpy, bmesh, math, re
from mathutils import Vector, Matrix

GLB = r'C:\Users\nieuwaccount\kenniskist\public\bos.glb'
sc = bpy.data.scenes.get('paintball_bos') or bpy.data.scenes.new('paintball_bos')
bpy.context.window.scene = sc
COL = bpy.data.collections.get('bos') or bpy.data.collections.new('bos')
if COL.name not in sc.collection.children: sc.collection.children.link(COL)
LCOL = bpy.data.collections.get('bos_licht') or bpy.data.collections.new('bos_licht')
if LCOL.name not in sc.collection.children: sc.collection.children.link(LCOL)
for o in list(COL.objects) + list(LCOL.objects): bpy.data.objects.remove(o, do_unlink=True)

def mat(naam, kleur, emis=0.0):
    m = bpy.data.materials.get(naam) or bpy.data.materials.new(naam)
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*kleur, 1)
    b.inputs['Roughness'].default_value = 0.9
    b.inputs['Emission Strength'].default_value = emis
    if emis: b.inputs['Emission Color'].default_value = (*kleur, 1)
    return m

M = {'bosgrond': mat('bosgrond', (0.13, 0.11, 0.07)), 'planken': mat('planken', (0.36, 0.26, 0.17)),
     'planken_donker': mat('planken_donker', (0.21, 0.15, 0.1)), 'dak_mos': mat('dak_mos', (0.14, 0.17, 0.1)),
     'schors': mat('schors', (0.18, 0.13, 0.09)), 'mosrots': mat('mosrots', (0.25, 0.27, 0.2)),
     'naald': mat('naald', (0.05, 0.15, 0.07)), 'naald2': mat('naald2', (0.07, 0.2, 0.09)),
     'hek': mat('hek', (0.3, 0.22, 0.14)), 'steen': mat('steen', (0.3, 0.3, 0.3)),
     'team_rood': mat('team_rood', (1.0, 0.2, 0.25), emis=6), 'team_blauw': mat('team_blauw', (0.23, 0.48, 1.0), emis=6),
     'lamp_warm': mat('lamp_warm', (1.0, 0.8, 0.5), emis=25), 'vuur': mat('vuur', (1.0, 0.45, 0.1), emis=30)}
OUD = {'grass': 'bosgrond', 'wood': 'planken', 'wood2': 'planken_donker', 'roof': 'dak_mos', 'bark': 'schors',
       'rock': 'mosrots', 'leaf': 'naald', 'leaf2': 'naald2', 'fence': 'hek', 'red': 'team_rood', 'blue': 'team_blauw'}

# ── import + opschonen ──
bpy.context.view_layer.active_layer_collection = bpy.context.view_layer.layer_collection.children[COL.name]
voor = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=GLB)
nieuw = [o for o in bpy.data.objects if o not in voor and o.type == 'MESH']
for o in bpy.data.objects:
    if o not in voor and o.type != 'MESH': bpy.data.objects.remove(o, do_unlink=True)
for o in nieuw:
    o.data = o.data.copy()
    mw = o.matrix_world.copy(); o.parent = None
    o.data.transform(mw); o.matrix_world = Matrix.Identity(4)
    for i, s in enumerate(o.data.materials):
        o.data.materials[i] = M[OUD.get(re.sub(r'\.\d+$', '', s.name), 'planken')]
    for uv in list(o.data.uv_layers): o.data.uv_layers.remove(uv)

# vloer: één vlak op y=0 (de oude dikke plaat had z'n bovenkant ook op 0)
for o in [o for o in nieuw if o.name.startswith('floor')]: bpy.data.objects.remove(o, do_unlink=True); nieuw.remove(o)
me = bpy.data.meshes.new('floor'); bm = bmesh.new()
bm.faces.new([bm.verts.new(v) for v in ((-43, -43, 0), (43, -43, 0), (43, 43, 0), (-43, 43, 0))]); bm.to_mesh(me); bm.free()
me.materials.append(M['bosgrond']); vl = bpy.data.objects.new('floor', me); COL.objects.link(vl)

# naalden: allemaal decor (geen dekking) en samen één mesh = één draw call
naalden = [o for o in nieuw if o.name.startswith('leaf')]
for o in naalden: o.select_set(False)
bpy.ops.object.select_all(action='DESELECT')
for o in naalden: o.select_set(True)
bpy.context.view_layer.objects.active = naalden[0]; bpy.ops.object.join()
naalden[0].name = 'deco_naalden'; naalden[0].data.name = 'deco_naalden'

# ── extra: kampvuur, lantaarns, teamlampen ──
def blok(naam, delen):
    bm = bmesh.new(); mats = []
    for kind, c, sz, m in delen:
        if m not in mats: mats.append(m)
        if kind == 'doos':
            r = bmesh.ops.create_cube(bm, size=1)
            bmesh.ops.scale(bm, vec=sz, verts=r['verts'])
        else:
            r = bmesh.ops.create_cone(bm, cap_ends=True, segments=kind[1], radius1=sz[0], radius2=sz[1], depth=sz[2])
        bmesh.ops.translate(bm, vec=Vector(c), verts=r['verts'])
        for f in {f for v in r['verts'] for f in v.link_faces}: f.material_index = mats.index(m)
    me = bpy.data.meshes.new(naam); bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(M[m])
    o = bpy.data.objects.new(naam, me); COL.objects.link(o); return o

def licht(naam, soort, loc, kleur, kracht, r=0.3, rot=None):
    d = bpy.data.lights.new(naam, soort); d.color = kleur; d.energy = kracht
    if soort == 'POINT': d.shadow_soft_size = r
    if soort == 'SUN': d.angle = math.radians(3)
    o = bpy.data.objects.new(naam, d); o.location = loc
    if rot: o.rotation_euler = rot
    LCOL.objects.link(o); return o

# kampvuur in het midden: stenen ring (dekking) + vlammen (decor)
ring = [('doos', (math.cos(a) * 0.85, math.sin(a) * 0.85, 0.15), (0.38, 0.3, 0.3), 'steen') for a in [i * math.pi / 4 for i in range(8)]]
blok('kampvuur', ring + [('doos', (0, 0, 0.12), (1.1, 0.22, 0.22), 'schors'), ('doos', (0, 0, 0.12), (0.22, 1.1, 0.22), 'schors')])
blok('deco_vlam', [(('c', 6), (0, 0, 0.55), (0.42, 0.0, 0.9), 'vuur'), (('c', 5), (0.18, 0.1, 0.4), (0.22, 0.0, 0.55), 'vuur')])
licht('vuur', 'POINT', (0, 0, 0.9), (1.0, 0.5, 0.18), 900, 0.4)

# hutten: lamp boven de deur buiten + warm licht binnen
for k in 'ABCDE':
    dl, dr, dak = (bpy.data.objects.get(f'c{k}_{s}') for s in ('dl', 'dr', 'roof'))
    if not (dl and dr and dak): continue
    mid = lambda o: sum((Vector(v.co) for v in o.data.vertices), Vector()) / len(o.data.vertices)
    deur = (mid(dl) + mid(dr)) / 2; c = mid(dak)
    uit = Vector((deur.x - c.x, deur.y - c.y, 0)).normalized()
    p = Vector((deur.x, deur.y, 2.05)) + uit * 0.35
    blok(f'deco_lamp_{k}', [('doos', tuple(p), (0.22, 0.22, 0.3), 'lamp_warm'), ('doos', tuple(p + Vector((0, 0, 0.2))), (0.3, 0.3, 0.06), 'planken_donker')])
    licht(f'lamp_{k}', 'POINT', p + uit * 0.15, (1.0, 0.72, 0.42), 220, 0.15)
    licht(f'hut_{k}', 'POINT', (c.x, c.y, 1.9), (1.0, 0.7, 0.4), 160, 0.3)

# teambases: twee lantaarnpalen achter elk vak
for team, y, kl in (('rood', 33, (1.0, 0.2, 0.25)), ('blauw', -33, (0.23, 0.48, 1.0))):
    s = 1 if y > 0 else -1
    for x in (-9.6, 9.6):
        p = (x, y + s * 4.6, 0)
        blok(f'paal_{team}_{int(x)}', [('doos', (p[0], p[1], 1.6), (0.18, 0.18, 3.2), 'planken_donker')])
        blok(f'deco_kop_{team}_{int(x)}', [('doos', (p[0], p[1], 3.35), (0.4, 0.4, 0.3), f'team_{team}')])
        licht(f'team_{team}_{int(x)}', 'POINT', (p[0], p[1] - s * 0.5, 3.1), kl, 900, 0.3)

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

# ── maan + nachthemel ──
licht('maan', 'SUN', (0, 0, 40), (0.62, 0.72, 1.0), 0.9, rot=(math.radians(50), 0, math.radians(35)))
w = bpy.data.worlds.get('nacht_bos') or bpy.data.worlds.new('nacht_bos'); sc.world = w; w.use_nodes = True
bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND')
bg.inputs['Color'].default_value = (0.03, 0.05, 0.08, 1); bg.inputs['Strength'].default_value = 2.0
print('bos gebouwd:', len(COL.objects), 'objecten,', len(LCOL.objects), 'lampen')
