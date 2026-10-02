# Maakt public/Broek/langebroek.glb: een broek met pijpen tot net boven de
# knie, gebouwd op het lijf van het poppetje.
#
#   blender -b --python tools/blender/langebroek.py            (net boven de knie)
#   blender -b --python tools/blender/langebroek.py -- 0.45    (eigen eindhoogte in m)
#
# Waarom niet de korte broek verlengen: die heeft een omgeslagen, wijdere zoom
# en een middenstuk dat tot vlak boven die zoom loopt, dus elke verlenging gaf
# een zichtbare overgang. Deze broek is één doorlopende vorm: het stuk van het
# lijf van taille tot knie, overal gelijkmatig iets naar buiten gezet, met
# precies de botgewichten van het lijf (beweegt dus exact mee).
import bpy, bmesh, math, sys, os
from mathutils import Vector

P = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public'))
UIT = os.path.join(P, 'Broek', 'langebroek.glb')
EIND_Z = float(sys.argv[sys.argv.index('--') + 1]) if '--' in sys.argv else None
TAILLE_Z = 0.895          # zelfde hoogte als de band van de korte broek
RUIM_TAILLE = 0.012       # zo ver van het lijf bij de taille (m)
RUIM_BEEN = 0.024         # en bij de benen
BEEN_BOTTEN = {'Root', 'Hips', 'Spine', 'LeftUpLeg', 'LeftLeg', 'RightUpLeg', 'RightLeg'}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(P, 'Poppetje.glb'))
lijf = next(o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Body'))
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')

knie = [(arm.matrix_world @ arm.data.bones[n].head_local).z for n in ('LeftLeg', 'RightLeg')]
KNIE_Z = sum(knie) / 2
if EIND_Z is None:
    EIND_Z = KNIE_Z + 0.035
print('knie z', round(KNIE_Z, 3), 'eind z', round(EIND_Z, 3))

# ── kopie van het lijf ─────────────────────────────────────────────────────
broek = lijf.copy()
broek.data = lijf.data.copy()
bpy.context.collection.objects.link(broek)
for o in list(bpy.data.objects):
    if o not in (broek, arm):
        bpy.data.objects.remove(o, do_unlink=True)
mw = broek.matrix_world
mwi = mw.inverted()
nrm_l = mw.to_3x3().transposed()      # normaal van wereld naar lokaal

bm = bmesh.new()
bm.from_mesh(broek.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
deform = bm.verts.layers.deform.active
# Richting "naar buiten" van het lijf onthouden: daarmee zetten we straks alle
# vlakken goed. (Blenders automatische versie draait een open broek soms
# binnenstebuiten, en dan kijk je er van buiten doorheen.)
bm.normal_update()
REF = {v: v.normal.copy() for v in bm.verts}
namen = {g.index: g.name for g in broek.vertex_groups}

# Armen en handen hangen op heuphoogte: alleen lijf- en beenpunten houden.
def hoofdbot(v):
    w = v[deform]
    return namen[max(w.keys(), key=lambda k: w[k])] if w else None
weg = [v for v in bm.verts if hoofdbot(v) not in BEEN_BOTTEN]
bmesh.ops.delete(bm, geom=weg, context='VERTS')

# Strak afsnijden op taille en net boven de knie.
for z, onder_weg in ((TAILLE_Z, False), (EIND_Z, True)):
    vlak_n = (nrm_l @ Vector((0, 0, 1))).normalized()
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                           plane_co=mwi @ Vector((0, 0, z)), plane_no=vlak_n,
                           clear_inner=onder_weg, clear_outer=not onder_weg)
# losse snippers (vingers e.d. die net binnen de snede vielen) opruimen
bm.verts.ensure_lookup_table()
eilanden, gezien = [], set()
for v in bm.verts:
    if v in gezien:
        continue
    stapel, eiland = [v], []
    gezien.add(v)
    while stapel:
        x = stapel.pop(); eiland.append(x)
        for e in x.link_edges:
            y = e.other_vert(x)
            if y not in gezien:
                gezien.add(y); stapel.append(y)
    eilanden.append(eiland)
grootste = max(eilanden, key=len)
bmesh.ops.delete(bm, geom=[v for e in eilanden if e is not grootste for v in e], context='VERTS')
print('eilanden', [len(e) for e in eilanden])

# ── gladmaken: het lijf heeft bij het kruis een scherpe knik, die geeft in
# de broek een plooi. Randen (taille, pijpen) blijven op hun plek.
rand_v = {v for e in bm.edges if e.is_boundary for v in e.verts}
binnen_v = [v for v in bm.verts if v not in rand_v]
kruis = [v for v in binnen_v if abs((mw @ v.co).x) < 0.07 and (mw @ v.co).z < 0.82]
for _ in range(2):
    bmesh.ops.smooth_vert(bm, verts=binnen_v, factor=0.35, use_axis_x=True, use_axis_y=True, use_axis_z=True)
for _ in range(6):
    bmesh.ops.smooth_vert(bm, verts=kruis, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)

# ── naar buiten zetten langs de (gladde) normaal ───────────────────────────
bm.normal_update()
W = lambda v: mw @ v.co
nieuwe_pos = {}
for v in bm.verts:
    p = W(v)
    n = (mw.to_3x3() @ v.normal).normalized()
    t = min(1.0, max(0.0, (TAILLE_Z - p.z) / 0.12))       # 0 bij taille, 1 vanaf 12 cm lager
    ruim = RUIM_TAILLE + (RUIM_BEEN - RUIM_TAILLE) * (t * t * (3 - 2 * t))
    nieuwe_pos[v] = mwi @ (p + n * ruim)
for v, q in nieuwe_pos.items():
    v.co = q

# ── zomen: kleine rand naar binnen bij de pijpen en de taille ──────────────
rand = [e for e in bm.edges if e.is_boundary]
over, lussen = set(rand), []
while over:
    e = over.pop()
    lus = [e.verts[0], e.verts[1]]
    while True:
        laatste = lus[-1]
        volgende = next((e2 for e2 in laatste.link_edges if e2 in over), None)
        if not volgende:
            break
        over.discard(volgende)
        v = volgende.other_vert(laatste)
        if v == lus[0]:
            break
        lus.append(v)
    lussen.append(lus)
print('lussen', [(len(l), round(sum(W(v).z for v in l) / len(l), 3)) for l in lussen])
for lus in lussen:
    if len(lus) < 6:
        continue
    pts = [W(v) for v in lus]
    c = sum(pts, Vector()) / len(pts)
    omhoog = 0.012 if c.z < 0.8 else -0.012
    binnen = [bm.verts.new(mwi @ Vector((c.x + (p.x - c.x) * 0.9, c.y + (p.y - c.y) * 0.9, p.z + omhoog))) for p in pts]
    for i in range(len(lus)):
        try:
            bm.faces.new((lus[i], lus[(i + 1) % len(lus)], binnen[(i + 1) % len(lus)], binnen[i]))
        except ValueError:
            pass
    # gewichten van de zoom = die van de rand
    for v, b in zip(lus, binnen):
        REF[b] = REF.get(v, Vector((0, 0, 0)))
        for k, w in v[deform].items():
            b[deform][k] = w

omgedraaid = 0
for f in bm.faces:
    ref = sum((REF[v] for v in f.verts if v in REF), Vector())
    f.normal_update()
    if ref.length > 0 and f.normal.dot(ref) < 0:
        f.normal_flip()
        omgedraaid += 1
print('vlakken omgedraaid', omgedraaid, 'van', len(bm.faces))
bm.to_mesh(broek.data)
bm.free()
broek.data.update()

# ── UV, gewichten opschonen, materiaal ─────────────────────────────────────
bpy.context.view_layer.objects.active = broek
for o in bpy.data.objects:
    o.select_set(False)
broek.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.02)
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)
bpy.ops.object.shade_smooth()

mat = bpy.data.materials.new('broek')
mat.use_nodes = True
bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
bsdf.inputs['Base Color'].default_value = (1, 1, 1, 1)
bsdf.inputs['Roughness'].default_value = 0.8
broek.data.materials.clear()
broek.data.materials.append(mat)
for img in list(bpy.data.images):
    bpy.data.images.remove(img)

broek.name = 'langebroek'
broek.data.name = 'langebroek'
zs = [(mw @ v.co).z for v in broek.data.vertices]
print('KLAAR verts', len(broek.data.vertices), 'faces', len(broek.data.polygons), 'z', round(min(zs), 3), round(max(zs), 3))

for o in bpy.data.objects:
    o.select_set(o in (broek, arm))
os.makedirs(os.path.dirname(UIT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=UIT, export_format='GLB', use_selection=True,
                          export_skins=True, export_animations=False, export_morph=False)
print('GESCHREVEN', UIT, os.path.getsize(UIT))
