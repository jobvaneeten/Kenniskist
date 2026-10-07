# Winkelkisten (public/crates/crate_*.webp) voor Blender: exec(open(pad).read()).
# Eén en dezelfde schatkist voor elke categorie, met het ECHTE kledingstuk uit
# het spel (shirtmodel.glb, langebroek.glb, ...) dat uit de open kist zweeft,
# in de accentkleur van die winkelkaart. Verwacht scene 'kisten' met per
# categorie een object 'kled_<categorie>' (geïmporteerd en gecentreerd).
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

sc = bpy.data.scenes['kisten']; bpy.context.window.scene = sc
UIT = os.path.join(os.environ.get('TEMP', r'C:\Temp'), 'kisten'); os.makedirs(UIT, exist_ok=True)
ACCENT = {'shirt': '#4ade80', 'broek': '#60a5fa', 'sokken': '#fbbf24', 'schoenen': '#e879f9', 'hoofd': '#fb923c'}
# hoe het kledingstuk boven de kist zweeft: (schaal → grootste maat, z, kanteling x, draai z)
HOUDING = {'shirt': (1.15, 1.45, 6, 22), 'broek': (1.1, 1.45, 4, 22), 'sokken': (1.0, 1.42, 4, 70),
           'schoenen': (1.2, 1.32, 12, 62), 'hoofd': (1.15, 1.45, 12, 120)}

def rgb(h): h = h.lstrip('#'); return tuple((int(h[i:i + 2], 16) / 255) ** 2.2 for i in (0, 2, 4))

KCOL = bpy.data.collections.get('kist') or bpy.data.collections.new('kist')
if KCOL.name not in sc.collection.children: sc.collection.children.link(KCOL)
for o in list(KCOL.objects): bpy.data.objects.remove(o, do_unlink=True)

def mat(naam, kleur, metaal=0.0, ruw=0.5, emis=0.0, alpha=1.0):
    m = bpy.data.materials.get(naam) or bpy.data.materials.new(naam); m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*kleur, 1); b.inputs['Metallic'].default_value = metaal
    b.inputs['Roughness'].default_value = ruw
    b.inputs['Emission Color'].default_value = (*kleur, 1); b.inputs['Emission Strength'].default_value = emis
    b.inputs['Alpha'].default_value = alpha
    if alpha < 1:
        try: m.surface_render_method = 'BLENDED'
        except Exception: m.blend_method = 'BLEND'
    return m
M = {'hout': mat('kist_hout', (0.16, 0.05, 0.32), 0, 0.55), 'hout_d': mat('kist_hout_d', (0.07, 0.02, 0.15), 0, 0.6),
     'goud': mat('kist_goud', (1.0, 0.68, 0.18), 1, 0.25), 'binnen': mat('kist_binnen', (1, 1, 1), 0, 0.5, 6),
     'gem': mat('kist_gem', (1, 1, 1), 0, 0.1, 3), 'kled': mat('kist_kled', (1, 1, 1), 0, 0.45), 'ster': mat('kist_ster', (1, 1, 1), 0, 0.3, 12)}

def doos(bm, mn, mx, bevel=0.03):
    r = bmesh.ops.create_cube(bm, size=1)
    c = (Vector(mn) + Vector(mx)) / 2; d = Vector(mx) - Vector(mn)
    bmesh.ops.transform(bm, matrix=Matrix.Translation(c) @ Matrix.Diagonal((*d, 1)), verts=r['verts'])
    if bevel:
        edges = list({e for v in r['verts'] for e in v.link_edges})
        bmesh.ops.bevel(bm, geom=r['verts'] + edges, offset=bevel, segments=3, affect='EDGES', profile=0.5)
def obj(naam, bm, m, smooth=True):
    me = bpy.data.meshes.new(naam); bm.to_mesh(me); bm.free(); me.materials.append(M[m])
    if smooth:
        for p in me.polygons: p.use_smooth = True
    o = bpy.data.objects.new(naam, me); KCOL.objects.link(o); return o

W, D, H = 0.82, 0.52, 0.86     # halve breedte, halve diepte, hoogte van de bak
# bak + plankgroeven
bm = bmesh.new(); doos(bm, (-W, -D, 0), (W, D, H), 0.06); obj('k_bak', bm, 'hout')
bm = bmesh.new()
for z in (0.28, 0.56): doos(bm, (-W + 0.02, -D - 0.012, z - 0.012), (W - 0.02, -D + 0.01, z + 0.012), 0)
obj('k_groef', bm, 'hout_d', False)
# goudbeslag: banden, voetrand, bovenrand, slot
bm = bmesh.new()
for x in (-0.56, 0.56): doos(bm, (x - 0.08, -D - 0.03, -0.01), (x + 0.08, D + 0.03, H + 0.02), 0.02)
doos(bm, (-W - 0.03, -D - 0.03, -0.01), (W + 0.03, D + 0.03, 0.09), 0.02)
doos(bm, (-W - 0.03, -D - 0.03, H - 0.07), (W + 0.03, D + 0.03, H + 0.01), 0.02)
for x in (-W, W):
    for y in (-D, D): doos(bm, (x - 0.06, y - 0.06, -0.01), (x + 0.06, y + 0.06, H + 0.02), 0.02)
doos(bm, (-0.17, -D - 0.06, 0.42), (0.17, -D + 0.01, 0.8), 0.04)
obj('k_goud', bm, 'goud')
# edelsteen in het slot (accentkleur)
bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=0.09)
bmesh.ops.transform(bm, matrix=Matrix.Translation((0, -D - 0.07, 0.6)) @ Matrix.Diagonal((1, 0.5, 1.15, 1)), verts=bm.verts)
obj('k_gem', bm, 'gem')
# gloeiende binnenkant
bm = bmesh.new(); doos(bm, (-W + 0.07, -D + 0.07, H - 0.12), (W - 0.07, D - 0.07, H - 0.02), 0); obj('k_binnen', bm, 'binnen', False)
# deksel: bol gewelfd blok met goudbanden, scharnier aan de achterkant, open
def dekselvorm(v):
    if v.co.z > 0.05: v.co.z += 0.1 * (1 - (v.co.y / (D + 0.02)) ** 2)   # licht gewelfd
bm = bmesh.new(); doos(bm, (-W - 0.02, -2 * D - 0.04, 0), (W + 0.02, 0, 0.2), 0.05)
for v in bm.verts:
    v.co.y += D + 0.02; dekselvorm(v); v.co.y -= D + 0.02
dek = obj('k_deksel', bm, 'hout')
bm = bmesh.new()
for x in (-0.56, 0.56): doos(bm, (x - 0.08, -2 * D - 0.06, -0.01), (x + 0.08, 0.01, 0.33), 0.02)
doos(bm, (-W - 0.04, -2 * D - 0.06, -0.01), (W + 0.04, -2 * D + 0.02, 0.24), 0.02)
dekg = obj('k_dekgoud', bm, 'goud')
for o in (dek, dekg):
    o.location = (0, D + 0.02, H); o.rotation_euler = (math.radians(-104), 0, 0)
# sterretjes
bm = bmesh.new()
for p in ((-1.0, -0.2, 1.7), (1.05, -0.3, 1.25), (-0.9, -0.5, 0.85), (0.85, -0.4, 2.05), (0.15, -0.6, 2.25), (-0.55, -0.3, 2.15)):
    r = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.045)
    bmesh.ops.translate(bm, verts=r['verts'], vec=p)
obj('k_sterren', bm, 'ster')

# ── licht, camera, render ──
for n in ('k_cam', 'k_key', 'k_rand', 'k_fill', 'k_binnenlicht'):
    o = bpy.data.objects.get(n)
    if o: bpy.data.objects.remove(o, do_unlink=True)
def licht(naam, soort, loc, kracht, kleur=(1, 1, 1), grootte=1.0, doel=(0, 0, 0.9)):
    d = bpy.data.lights.new(naam, soort); d.energy = kracht; d.color = kleur
    if soort == 'AREA': d.size = grootte
    o = bpy.data.objects.new(naam, d); o.location = loc; KCOL.objects.link(o)
    o.rotation_euler = (Vector(doel) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return o
licht('k_key', 'AREA', (-2.2, -3.0, 3.4), 420, (1, 0.96, 0.9), 2.5)
licht('k_fill', 'AREA', (3.0, -2.0, 1.2), 160, (0.75, 0.8, 1), 3)
rand = licht('k_rand', 'AREA', (0.5, 3.0, 2.6), 500, (1, 1, 1), 2)
bin_ = licht('k_binnenlicht', 'POINT', (0, 0, H + 0.25), 90)
cam = bpy.data.objects.new('k_cam', bpy.data.cameras.new('k_cam')); KCOL.objects.link(cam)
cam.location = (2.15, -4.3, 2.55); cam.data.lens = 50
cam.rotation_euler = (Vector((0, 0, 1.05)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
sc.camera = cam
w = sc.world or bpy.data.worlds.new('kisten'); sc.world = w; w.use_nodes = True
bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND')
bg.inputs['Color'].default_value = (0.05, 0.04, 0.1, 1); bg.inputs['Strength'].default_value = 0.6
for e in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
    try: sc.render.engine = e; break
    except TypeError: pass
sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = 640; sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
sc.view_settings.view_transform = 'Standard'   # felle kleuren, geen pastel

def render(k):
    acc = rgb(ACCENT[k])
    for naam in ('binnen', 'gem', 'ster'):
        b = next(n for n in M[naam].node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        mix = tuple(a * 0.75 + 0.25 for a in acc) if naam == 'binnen' else acc
        b.inputs['Base Color'].default_value = (*mix, 1); b.inputs['Emission Color'].default_value = (*mix, 1)
    bk = next(n for n in M['kled'].node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    bk.inputs['Base Color'].default_value = (*acc, 1)
    rand.data.color = tuple(a * 0.6 + 0.4 for a in acc); bin_.data.color = acc
    for kk in ACCENT:
        o = bpy.data.objects.get('kled_' + kk)
        if not o: continue
        zicht = kk == k
        o.hide_render = not zicht; o.hide_viewport = not zicht
        if zicht:
            o.data.materials.clear(); o.data.materials.append(M['kled'])
            for p in o.data.polygons: p.use_smooth = True
            s, z, kx, rz = HOUDING[kk]
            o.scale = (1, 1, 1); bpy.context.view_layer.update()
            f = s / max(o.dimensions)
            o.scale = (f, f, f); o.location = (0, -0.12, z)
            o.rotation_euler = (math.radians(kx), 0, math.radians(rz))
    sc.render.filepath = os.path.join(UIT, k + '.png')
    bpy.ops.render.render(write_still=True)
    return sc.render.filepath
print('kist gebouwd; render(k) beschikbaar')
