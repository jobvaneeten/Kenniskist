# Gebakken lightmaps ontruisen (OIDN via de compositor) en als JPEG wegschrijven.
# Gebruik in Blender:  LIGHTMAPS = [('lm_grond', r'...\lm_grond.jpg'), ...]; exec(open(pad).read())
# Lichtwaarden worden lineair × SCHAAL opgeslagen; Blender zet ze bij het
# opslaan om naar sRGB, wat een prettige 'gamma'-verdeling geeft (veel
# precisie in het donker). In het spel staat lichtNiveau ≈ 1.
import bpy, os, numpy as np
SCHAAL = globals().get('SCHAAL', 0.8)
TMP = os.path.join(os.environ.get('TEMP', r'C:\Temp'), 'kk_bake'); os.makedirs(TMP, exist_ok=True)

def ontruis(naam):
    src = bpy.data.images[naam]
    w, h = src.size
    sc = bpy.data.scenes.get('ontruis') or bpy.data.scenes.new('ontruis')
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = w, h, 100
    if not sc.camera:
        cam = bpy.data.objects.new('ontruis_cam', bpy.data.cameras.new('ontruis_cam'))
        sc.collection.objects.link(cam); sc.camera = cam
    ng = bpy.data.node_groups.get('ontruis_ng')
    if ng: bpy.data.node_groups.remove(ng)
    ng = bpy.data.node_groups.new('ontruis_ng', 'CompositorNodeTree')
    ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    im = ng.nodes.new('CompositorNodeImage'); im.image = src
    dn = ng.nodes.new('CompositorNodeDenoise')
    out = ng.nodes.new('NodeGroupOutput')
    ng.links.new(im.outputs['Image'], dn.inputs['Image']); ng.links.new(dn.outputs['Image'], out.inputs[0])
    sc.compositing_node_group = ng; sc.render.use_compositing = True
    sc.view_settings.view_transform = 'Standard'
    sc.render.image_settings.file_format = 'OPEN_EXR'; sc.render.image_settings.color_depth = '32'
    pad = os.path.join(TMP, naam + '_dn.exr')
    bpy.ops.render.render(scene=sc.name, write_still=False)
    bpy.data.images['Render Result'].save_render(pad, scene=sc)
    oud = bpy.data.images.get(naam + '_dn')
    if oud: bpy.data.images.remove(oud)
    r = bpy.data.images.load(pad); r.name = naam + '_dn'
    return r

def schrijf(naam, doel):
    dn = ontruis(naam)
    a = np.empty(len(dn.pixels), dtype=np.float32); dn.pixels.foreach_get(a)
    a = a.reshape(-1, 4); a[:, :3] *= SCHAAL; a[:, 3] = 1.0
    kop = bpy.data.images.get(naam + '_uit')
    if kop: bpy.data.images.remove(kop)
    kop = bpy.data.images.new(naam + '_uit', dn.size[0], dn.size[1], float_buffer=True)
    kop.pixels.foreach_set(a.ravel())
    sc = bpy.data.scenes['ontruis']
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    sc.view_settings.exposure = 0; sc.view_settings.gamma = 1
    sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 88
    os.makedirs(os.path.dirname(doel), exist_ok=True)
    kop.save_render(doel, scene=sc)
    print(naam, '→', doel, os.path.getsize(doel) // 1024, 'KB')

for naam, doel in LIGHTMAPS:
    schrijf(naam, doel)
