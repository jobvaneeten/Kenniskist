# Rendert de vijf winkelkisten zonder Blender-venster:
#   blender -b --factory-startup --python tools/blender/render_kisten.py
# Importeert de echte kledingmodellen uit public/, bouwt de kist
# (bouw_kisten.py) en schrijft %TEMP%/kisten/<categorie>.png.
import bpy, sys, io, os
from mathutils import Matrix, Vector

HIER = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(HIER, '..', '..', 'public')
BESTANDEN = {'shirt': 'shirtmodel.glb', 'broek': 'Broek/langebroek.glb', 'sokken': 'sokken.glb',
             'schoenen': 'Schoenen/schoenengoed.glb', 'hoofd': 'Pet/petnormaal.glb'}

sc = bpy.context.scene; sc.name = 'kisten'
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for k, f in BESTANDEN.items():
    voor = set(bpy.data.objects)
    _o = sys.stdout; sys.stdout = io.StringIO()
    bpy.ops.import_scene.gltf(filepath=os.path.join(PUB, f))
    sys.stdout = _o
    nieuw = [o for o in bpy.data.objects if o not in voor]
    dg = bpy.context.evaluated_depsgraph_get()
    bron = max((o for o in nieuw if o.type == 'MESH' and not o.name.startswith('Icosphere')), key=lambda o: len(o.data.vertices))
    me = bpy.data.meshes.new_from_object(bron.evaluated_get(dg), depsgraph=dg); me.transform(bron.matrix_world)
    for o in nieuw: bpy.data.objects.remove(o, do_unlink=True)
    vs = [v.co.copy() for v in me.vertices]
    c = Vector([(min(v[i] for v in vs) + max(v[i] for v in vs)) / 2 for i in range(3)])
    me.transform(Matrix.Translation(-c))
    sc.collection.objects.link(bpy.data.objects.new('kled_' + k, me))

exec(open(os.path.join(HIER, 'bouw_kisten.py'), encoding='utf8').read())
# Cycles op de GPU: betrouwbaar zonder venster
sc.render.engine = 'CYCLES'
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'OPTIX'; prefs.refresh_devices()
    for d in prefs.devices: d.use = d.type == 'OPTIX'
    sc.cycles.device = 'GPU'
except Exception as e:
    print('geen GPU:', e)
sc.cycles.samples = 96; sc.cycles.use_denoising = True
for k in (sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else BESTANDEN):
    print('KLAAR', render(k))
