# Kist als 3D-model voor de lootbox-animatie (public/crates/kist.glb):
#   blender -b --factory-startup --python tools/blender/exporteer_kist.py
# Zelfde kist als de winkelplaatjes (bouw_kisten.py), maar dicht, met het
# deksel als los object waarvan de oorsprong op het scharnier ligt.
import bpy, os, sys, io

HIER = os.path.dirname(os.path.abspath(__file__))
sc = bpy.context.scene; sc.name = 'kisten'
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
exec(open(os.path.join(HIER, 'bouw_kisten.py'), encoding='utf8').read())

for o in list(KCOL.objects):
    if o.type != 'MESH' or o.name == 'k_sterren': bpy.data.objects.remove(o, do_unlink=True)
# deksel + goudbanden samen: één object 'k_deksel' (scharnier = oorsprong), dicht
dek, dekg = bpy.data.objects['k_deksel'], bpy.data.objects['k_dekgoud']
for o in (dek, dekg): o.rotation_euler = (0, 0, 0)
bpy.ops.object.select_all(action='DESELECT')
dek.select_set(True); dekg.select_set(True); bpy.context.view_layer.objects.active = dek
bpy.ops.object.join()
# romp: alles behalve deksel en edelsteen/binnenkant samen (minder draw calls)
romp = [bpy.data.objects[n] for n in ('k_bak', 'k_groef', 'k_goud')]
bpy.ops.object.select_all(action='DESELECT')
for o in romp: o.select_set(True)
bpy.context.view_layer.objects.active = romp[0]
bpy.ops.object.join(); romp[0].name = 'k_romp'

# UV's in meters (wereldprojectie per vlak) voor de houtnerf in het spel
import bmesh
for o in bpy.data.objects:
    if o.type != 'MESH': continue
    bm = bmesh.new(); bm.from_mesh(o.data)
    uvl = bm.loops.layers.uv.get('UVMap') or bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for l in f.loops:
            co = l.vert.co
            l[uvl].uv = (co.x, co.y) if ax == 2 else (co.y, co.z) if ax == 0 else (co.x, co.z)
    bm.to_mesh(o.data); bm.free()

uit = os.path.join(HIER, '..', '..', 'public', 'crates', 'kist.glb')
bpy.ops.object.select_all(action='SELECT')
_o = sys.stdout; sys.stdout = io.StringIO()
bpy.ops.export_scene.gltf(filepath=uit, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
                          export_materials='EXPORT', export_texcoords=True, export_normals=True, export_image_format='NONE')
sys.stdout = _o
print('KLAAR', [o.name for o in bpy.data.objects], os.path.getsize(uit) // 1024, 'KB')
