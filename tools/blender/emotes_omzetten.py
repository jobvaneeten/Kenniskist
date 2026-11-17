# Zet Mixamo-animaties (standaard Y Bot, mixamorig:*) om naar het skelet van
# het Poppetje en exporteert ze als public/emote_<naam>.glb. Zo hoef je in
# Mixamo niet eerst het Poppetje te uploaden.
#
# Gebruik (Blender, Python-console):
#   1. importeer een oude emote-FBX van het Poppetje (bv. Emotebreakdance.fbx)
#      en noem het skelet 'DOEL'
#   2. zet de Mixamo-FBX's in D (hieronder) en de namen in LIJST
#   3. exec(open('tools/blender/emotes_omzetten.py').read()); alles()
#      (of alles(['backflip']) voor één emote)
# Daarna de emote toevoegen aan src/games/online/emotes.js.
import bpy, os
from mathutils import Quaternion

VINGERS = [f'{k}{h}{n}' for k in ('Left', 'Right') for h in ('HandIndex', 'HandMiddle', 'HandPinky', 'HandRing', 'HandThumb') for n in (1, 2)]
KAART = {n: n for n in ['Hips', 'Spine', 'Neck', 'Head',
         'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
         'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'] + VINGERS}
KAART['Spine1'] = 'Spine2'   # Poppetje heeft twee wervels: de bovenste volgt de borst

LIJST = {'Waving': 'zwaaien', 'Cheering': 'juichen', 'Clapping': 'klappen', 'VictoryIdle': 'overwinning',
         'ChickenDance': 'kippendans', 'SalsaDancing': 'salsa', 'CabbagePatch': 'cabbage', 'Twist': 'twist',
         'RobotHipHopDance': 'robot', 'GangnamStyle': 'gangnam', 'Breakdance1990': 'handstand', 'Flair': 'flair',
         'Backflip': 'backflip', 'Armada': 'capoeira', 'ThrillerPart2': 'thriller'}
D = 'C:/Users/nieuwaccount/Downloads/mixamo_emotes/'
UIT = 'C:/Users/nieuwaccount/kenniskist/public/'


def wrot(m):
    return m.to_3x3().normalized().to_quaternion()


def retarget(doel, bron, naam):
    sc = bpy.context.scene
    act = bron.animation_data.action
    f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
    objq = wrot(doel.matrix_world)
    restT = {b.name: wrot(doel.matrix_world @ b.matrix_local) for b in doel.data.bones}
    restS = {b.name: wrot(bron.matrix_world @ b.matrix_local) for b in bron.data.bones}
    hipS0 = bron.matrix_world @ bron.data.bones['mixamorig:Hips'].head_local
    hipT0 = doel.matrix_world @ doel.data.bones['Hips'].head_local
    ratio = hipT0.z / hipS0.z
    M = (doel.matrix_world @ doel.data.bones['Root'].matrix_local).to_3x3()
    volgorde = []

    def loop(b):
        volgorde.append(b)
        for c in b.children:
            loop(c)
    for b in doel.data.bones:
        if b.parent is None:
            loop(b)
    if doel.animation_data and doel.animation_data.action:
        oud = doel.animation_data.action
        doel.animation_data.action = None
        if oud.users == 0:
            bpy.data.actions.remove(oud)
    nieuw = bpy.data.actions.new(naam)
    doel.animation_data_create()
    doel.animation_data.action = nieuw
    for pb in doel.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0); pb.scale = (1, 1, 1)
    deltas = []
    for f in range(f0, f1 + 1):
        sc.frame_set(f)
        W = {}
        for b in volgorde:
            pw = W[b.parent.name] if b.parent else objq
            rp = restT[b.parent.name] if b.parent else objq
            rel = rp.inverted() @ restT[b.name]
            s = KAART.get(b.name)
            pb = doel.pose.bones[b.name]
            if s and ('mixamorig:' + s) in bron.pose.bones:
                sn = 'mixamorig:' + s
                ws = wrot(bron.matrix_world @ bron.pose.bones[sn].matrix)
                wd = ws @ restS[sn].inverted() @ restT[b.name]
                pb.rotation_quaternion = rel.inverted() @ pw.inverted() @ wd
                W[b.name] = wd
            else:
                pb.rotation_quaternion = (1, 0, 0, 0)
                W[b.name] = pw @ rel
            pb.keyframe_insert('rotation_quaternion', frame=f)
        hs = bron.matrix_world @ bron.pose.bones['mixamorig:Hips'].head
        deltas.append((hs - hipS0) * ratio)
    # Root: heupbeweging, zonder de horizontale drift van begin naar eind
    a, z = deltas[0], deltas[-1]
    n = max(1, len(deltas) - 1)
    rootpb = doel.pose.bones['Root']
    for i, d in enumerate(deltas):
        t = i / n
        w = d.copy()
        w.x -= a.x + (z.x - a.x) * t
        w.y -= a.y + (z.y - a.y) * t
        rootpb.location = M.inverted() @ w
        rootpb.keyframe_insert('location', frame=f0 + i)
    return f0, f1


def alles(alleen=None):
    sc = bpy.context.scene
    doel = bpy.data.objects['DOEL']
    uit = {}
    for bron_naam, key in LIJST.items():
        if alleen and key not in alleen:
            continue
        for o in list(sc.objects):
            if o.name != 'DOEL':
                bpy.data.objects.remove(o)
        bpy.ops.import_scene.fbx(filepath=D + bron_naam + '.fbx')
        bron = [o for o in sc.objects if o.type == 'ARMATURE' and o.name != 'DOEL'][0]
        f0, f1 = retarget(doel, bron, 'emote_' + key)
        bronact = bron.animation_data.action
        bpy.data.objects.remove(bron)
        if bronact.users == 0:
            bpy.data.actions.remove(bronact)
        sc.frame_start, sc.frame_end = f0, f1
        bpy.ops.object.select_all(action='DESELECT')
        doel.select_set(True)
        bpy.context.view_layer.objects.active = doel
        pad = UIT + 'emote_' + key + '.glb'
        bpy.ops.export_scene.gltf(filepath=pad, export_format='GLB', use_selection=True,
                                  export_animations=True, export_animation_mode='ACTIVE_ACTIONS')
        uit[key] = (f1 - f0 + 1, os.path.getsize(pad))
    return uit
