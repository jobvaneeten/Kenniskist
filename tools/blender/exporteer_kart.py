# Kart exporteren met zo min mogelijk materialen (= draw calls per kart):
#   blender -b tools/blender/paintball.blend --python tools/blender/exporteer_kart.py
# Body: stoel/band → zwart, achterlicht → neon (6 materialen i.p.v. 9).
# Wielen: lak → chroom, zwart → band (2 i.p.v. 4 per wiel).
import bpy, os, sys, io

HIER = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(HIER, 'bouw_kart.py'), encoding='utf8').read())

def samenvoegen(o, kaart):
    me = o.data
    namen = [m.name if m else '' for m in me.materials]
    doel = [kaart.get(n, n) for n in namen]
    uniek = list(dict.fromkeys(doel))
    idx = [uniek.index(d) for d in doel]
    for p in me.polygons: p.material_index = idx[p.material_index]
    me.materials.clear()
    for n in uniek: me.materials.append(bpy.data.materials[n])

for o in COL.objects:
    if o.name.startswith('wiel_'): samenvoegen(o, {'lak': 'chroom', 'zwart': 'band'})
    else: samenvoegen(o, {'stoel': 'zwart', 'band': 'zwart', 'achterlicht': 'neon'})
    print(o.name, [m.name for m in o.data.materials])

vl = bpy.context.view_layer
vl.active_layer_collection = vl.layer_collection.children['kart']
for ob in bpy.data.objects:
    try: ob.select_set(False)
    except Exception: pass
pad = os.path.join(HIER, '..', '..', 'public', 'ballonnen', 'kart.glb')
_o = sys.stdout; sys.stdout = io.StringIO()
bpy.ops.export_scene.gltf(filepath=pad, export_format='GLB', use_active_collection=True, use_active_scene=True,
                          export_apply=True, export_yup=True, export_materials='EXPORT', export_texcoords=False, export_normals=True, export_image_format='NONE')
sys.stdout = _o
print('KLAAR', os.path.getsize(pad) // 1024, 'KB')
