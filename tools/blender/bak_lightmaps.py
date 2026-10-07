# Lightmaps bakken voor een map-scene (draaien in Blender: zet eerst de
# variabelen hieronder, dan exec(open(pad).read())).
#   SCENE, COLLECTIE         bv. 'paintball_stad', 'stad'
#   LM_VLOER, LM_REST        namen van de twee lightmaps (vloer krijgt een eigen atlas)
#   ZONDER                   naam-voorvoegsels die niet gebakken worden (zelflichtend/silhouet)
#   SAMPLES                  64 is genoeg met OIDN; hoger = trager en GPU langer op 100%
# Bakt asynchroon (bpy.app.timers) zodat Blender bereikbaar blijft; per atlas
# komt er een EXR + '.klaar' in %TEMP%/kk_bake. Daarna lightmap_uit.py.
import bpy, bmesh, os, time
sc = bpy.data.scenes[SCENE]; bpy.context.window.scene = sc
COL = bpy.data.collections[COLLECTIE]
SAMPLES = globals().get('SAMPLES', 64)
TMP = os.path.join(os.environ.get('TEMP', r'C:\Temp'), 'kk_bake'); os.makedirs(TMP, exist_ok=True)
for f in os.listdir(TMP): os.remove(os.path.join(TMP, f))
if bpy.context.mode != 'OBJECT': bpy.ops.object.mode_set(mode='OBJECT')

statisch = [o for o in COL.objects if o.type == 'MESH' and not o.name.startswith(tuple(ZONDER))]
vloer = [o for o in statisch if o.name.startswith('floor')]
# objecten met vlakken eerst: een leeg object als actief breekt de UV-operator
rest = sorted([o for o in statisch if not o.name.startswith('floor')], key=lambda o: len(o.data.polygons) == 0)
for o in rest:   # onzichtbare onderkanten weg (scheelt atlasruimte)
    bm = bmesh.new(); bm.from_mesh(o.data)
    weg = [f for f in bm.faces if f.normal.z < -0.9 and max(v.co.z for v in f.verts) < 0.05]
    bmesh.ops.delete(bm, geom=weg, context='FACES'); bm.to_mesh(o.data); bm.free()
rest = [o for o in rest if len(o.data.polygons)]
for o in statisch:
    me = o.data
    if 'Lightmap' not in me.uv_layers: me.uv_layers.new(name='Lightmap')
    me.uv_layers['UVMap'].active_render = True

def smart(objs, marge):
    for o in sc.objects: o.select_set(False)
    for o in objs: o.select_set(True); o.data.uv_layers.active = o.data.uv_layers['Lightmap']
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=marge, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.pack_islands(margin=marge, rotate=True, shape_method='AABB')
    bpy.ops.object.mode_set(mode='OBJECT')
smart(vloer, 0.001); smart(rest, 0.002)

for naam in (LM_VLOER, LM_REST):
    im = bpy.data.images.get(naam)
    if im: bpy.data.images.remove(im)
    bpy.data.images.new(naam, 2048, 2048, float_buffer=True)
prefs = bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type = 'OPTIX'; prefs.refresh_devices()
for d in prefs.devices: d.use = (d.type == 'OPTIX')
sc.render.engine = 'CYCLES'; sc.cycles.device = 'GPU'; sc.cycles.samples = SAMPLES
sc.render.bake.use_pass_direct = True; sc.render.bake.use_pass_indirect = True; sc.render.bake.use_pass_color = False
sc.render.bake.margin = 6
GROEPEN = [(vloer, LM_VLOER), (rest, LM_REST)]

def bak_volgende(rij=[0, 1]):
    if not rij: return None
    objs, naam = GROEPEN[rij.pop(0)]; im = bpy.data.images[naam]
    for o in objs:
        for s in o.material_slots:
            nt = s.material.node_tree
            n = nt.nodes.get('BAKE') or nt.nodes.new('ShaderNodeTexImage'); n.name = 'BAKE'
            n.image = im; nt.nodes.active = n
    for o in sc.objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    t = time.time(); bpy.ops.object.bake(type='DIFFUSE')
    im.filepath_raw = os.path.join(TMP, naam + '.exr'); im.file_format = 'OPEN_EXR'; im.save()
    open(os.path.join(TMP, naam + '.klaar'), 'w').write(str(round(time.time() - t)))
    return 1.0 if rij else None
bpy.app.timers.register(bak_volgende, first_interval=1.0)
print('bake gestart:', len(vloer), 'vloer +', len(rest), 'objecten,', SAMPLES, 'samples')
