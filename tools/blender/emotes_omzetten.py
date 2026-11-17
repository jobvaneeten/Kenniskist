# Zet animaties om naar het skelet van het Poppetje (public/Poppetje.glb) en
# exporteert ze als public/<bestand>.glb. Bronnen: Mixamo-FBX's op het
# standaardpoppetje (mixamorig:*) of oude emote-GLB's (zelfde botnamen).
#
# Waarom zo: het spel rekent een animatie om met de ruststand uit het bestand.
# Is die ruststand precies die van Poppetje.glb, dan klopt alles; de armen van
# het Poppetje staan in rust iets lager dan in Mixamo, en dat gaf scheve armen.
# Daarom: doelskelet = Poppetje.glb zelf, en armen en benen eerst in dezelfde
# richting als bij de bron zetten voordat de beweging erop komt. De richting is
# die van gewricht naar gewricht (niet hoe het bot getekend is). Romp, nek en
# hoofd krijgen geen extra draaiing: die staan in beide skeletten rechtop, en
# uitrichten liet het poppetje achterover hangen en omhoog kijken.
#
# Gebruik (Blender, Python):
#   exec(open('C:/Users/nieuwaccount/kenniskist/tools/blender/emotes_omzetten.py').read())
#   alles()                 # alle emotes uit LIJST
#   alles(['backflip'])     # één emote
# Nieuwe emote: FBX (Mixamo, zonder skin) in D zetten, toevoegen aan LIJST en
# aan src/games/online/emotes.js.
import bpy, os
from mathutils import Quaternion

KIST = 'C:/Users/nieuwaccount/kenniskist/public/'
MAX_VLOER = 0.35   # meter
D = 'C:/Users/nieuwaccount/Downloads/mixamo_emotes/'

# uitvoer → (bronbestand, soort)
LIJST = {
    'emote_zwaaien.glb': (D + 'Waving.fbx', 'mixamo'),
    'emote_juichen.glb': (D + 'Cheering.fbx', 'mixamo'),
    'emote_klappen.glb': (D + 'Clapping.fbx', 'mixamo'),
    'emote_overwinning.glb': (D + 'VictoryIdle.fbx', 'mixamo'),
    'emote_kippendans.glb': (D + 'ChickenDance.fbx', 'mixamo'),
    'emote_salsa.glb': (D + 'SalsaDancing.fbx', 'mixamo'),
    'emote_cabbage.glb': (D + 'CabbagePatch.fbx', 'mixamo'),
    'emote_twist.glb': (D + 'Twist.fbx', 'mixamo'),
    'emote_robot.glb': (D + 'RobotHipHopDance.fbx', 'mixamo'),
    'emote_gangnam.glb': (D + 'GangnamStyle.fbx', 'mixamo'),
    'emote_handstand.glb': (D + 'Breakdance1990.fbx', 'mixamo'),
    'emote_flair.glb': (D + 'Flair.fbx', 'mixamo'),
    'emote_backflip.glb': (D + 'Backflip.fbx', 'mixamo'),
    'emote_capoeira.glb': (D + 'Armada.fbx', 'mixamo'),
    'emote_thriller.glb': (D + 'ThrillerPart2.fbx', 'mixamo'),
    # oude emotes (al op het Poppetje-skelet, maar met de oude ruststand)
    'hip_hop_dancing.glb': (D + 'oud/hip_hop_dancing.glb', 'oud'),
    'emote_breakdance.glb': (D + 'oud/emote_breakdance.glb', 'oud'),
    'emotespringen.glb': (D + 'oud/emotespringen.glb', 'oud'),
    'emotelopen.glb': (D + 'oud/emotelopen.glb', 'oud'),
    'emotegeraakt.glb': (D + 'oud/emotegeraakt.glb', 'oud'),
    'emote_verloren.glb': (D + 'oud/emote_verloren.glb', 'oud'),
}

VINGERS = [f'{k}{h}{n}' for k in ('Left', 'Right') for h in ('HandIndex', 'HandMiddle', 'HandPinky', 'HandRing', 'HandThumb') for n in (1, 2)]
HOOFD = ['Hips', 'Spine', 'Spine1', 'Neck', 'Head',
         'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
         'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase']


def kaart(soort):
    if soort == 'mixamo':
        k = {n: 'mixamorig:' + n for n in HOOFD + VINGERS}
        k['Spine1'] = 'mixamorig:Spine2'   # Poppetje heeft twee wervels: de bovenste volgt de borst
        return k
    return {n: n for n in HOOFD + VINGERS}


def wrot(m):
    return m.to_3x3().normalized().to_quaternion()


# bot → het gewricht waar het naartoe wijst (voor de richting van armen en benen)
NAAR = {}
for z in ('Left', 'Right'):
    NAAR.update({z + 'Shoulder': z + 'Arm', z + 'Arm': z + 'ForeArm', z + 'ForeArm': z + 'Hand', z + 'Hand': z + 'HandMiddle1',
                 z + 'UpLeg': z + 'Leg', z + 'Leg': z + 'Foot', z + 'Foot': z + 'ToeBase'})
    for v in ('Index', 'Middle', 'Pinky', 'Ring', 'Thumb'):
        NAAR[z + 'Hand' + v + '1'] = z + 'Hand' + v + '2'


def gewricht(a, naam):
    return a.matrix_world @ a.data.bones[naam].head_local


def doelskelet():
    """Het skelet uit Poppetje.glb, in een eigen scene (meshes eruit)."""
    sc = bpy.data.scenes.get('emotes') or bpy.data.scenes.new('emotes')
    bpy.context.window.scene = sc
    d = bpy.data.objects.get('POPPETJE')
    if d and d.name in sc.objects:
        return d
    for o in list(sc.objects):
        bpy.data.objects.remove(o)
    bpy.ops.import_scene.gltf(filepath=KIST + 'Poppetje.glb', bone_heuristic='TEMPERANCE')
    d = [o for o in sc.objects if o.type == 'ARMATURE'][0]
    for o in list(sc.objects):
        if o != d:
            bpy.data.objects.remove(o)
    d.name = 'POPPETJE'
    return d


def retarget(doel, bron, naam, k):
    sc = bpy.context.scene
    act = bron.animation_data.action
    f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
    objq = wrot(doel.matrix_world)
    restT = {b.name: wrot(doel.matrix_world @ b.matrix_local) for b in doel.data.bones}
    restS = {b.name: wrot(bron.matrix_world @ b.matrix_local) for b in bron.data.bones}
    # armen en benen eerst in de richting van de bron (zelfde rusthouding);
    # botten zonder eigen richting (vingertoppen, tenen) volgen hun ouder
    pref = k['Hips'][:-4]
    draai = {}
    for b in doel.data.bones:      # ouders komen vóór kinderen
        s = k.get(b.name)
        if not s or s not in bron.data.bones:
            continue
        nb = NAAR.get(b.name)
        if nb and nb in doel.data.bones and (pref + nb) in bron.data.bones:
            dT = (gewricht(doel, nb) - gewricht(doel, b.name)).normalized()
            dS = (gewricht(bron, pref + nb) - gewricht(bron, s)).normalized()
            draai[b.name] = dT.rotation_difference(dS)
        elif b.parent and b.parent.name in draai and not b.name.startswith(('Hips', 'Spine', 'Neck', 'Head')):
            draai[b.name] = draai[b.parent.name]
        else:
            draai[b.name] = Quaternion()
    uitgelijnd = {n: draai[n] @ restT[n] for n in draai}
    hipsS = k['Hips']
    hipS0 = bron.matrix_world @ bron.data.bones[hipsS].head_local
    hipT0 = doel.matrix_world @ doel.data.bones['Hips'].head_local
    ratio = (hipT0.z - (doel.matrix_world @ doel.data.bones['Root'].head_local).z) / max(1e-6, hipS0.z)
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
    doel.animation_data_create()
    doel.animation_data.action = bpy.data.actions.new(naam)
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
            pb = doel.pose.bones[b.name]
            if b.name in uitgelijnd:
                sn = k[b.name]
                ws = wrot(bron.matrix_world @ bron.pose.bones[sn].matrix)
                wd = ws @ restS[sn].inverted() @ uitgelijnd[b.name]
                pb.rotation_quaternion = rel.inverted() @ pw.inverted() @ wd
                W[b.name] = wd
            else:
                pb.rotation_quaternion = (1, 0, 0, 0)
                W[b.name] = pw @ rel
            pb.keyframe_insert('rotation_quaternion', frame=f)
        hs = bron.matrix_world @ bron.pose.bones[hipsS].head
        deltas.append((hs - hipS0) * ratio)
    # Root: heupbeweging, zonder de horizontale drift van begin naar eind, en
    # over de vloer hooguit MAX_VLOER meter (een dans moet op zijn plek blijven)
    a, z = deltas[0], deltas[-1]
    n = max(1, len(deltas) - 1)
    rootpb = doel.pose.bones['Root']
    vlak = []
    for i, d in enumerate(deltas):
        t = i / n
        w = d.copy()
        w.x -= a.x + (z.x - a.x) * t
        w.y -= a.y + (z.y - a.y) * t
        vlak.append(w)
    verst = max((w.x * w.x + w.y * w.y) ** 0.5 for w in vlak)
    f = min(1.0, MAX_VLOER / verst) if verst > 0 else 1.0
    for i, w in enumerate(vlak):
        w.x *= f; w.y *= f
        rootpb.location = M.inverted() @ w
        rootpb.keyframe_insert('location', frame=f0 + i)
    return f0, f1


def importeer(pad):
    voor = set(bpy.context.scene.objects)
    if pad.lower().endswith('.fbx'):
        bpy.ops.import_scene.fbx(filepath=pad)
    else:
        bpy.ops.import_scene.gltf(filepath=pad, bone_heuristic='TEMPERANCE')
    nieuw = [o for o in bpy.context.scene.objects if o not in voor]
    bron = [o for o in nieuw if o.type == 'ARMATURE'][0]
    return bron, nieuw


def alles(alleen=None):
    doel = doelskelet()
    sc = bpy.context.scene
    uit = {}
    for bestand, (pad, soort) in LIJST.items():
        if alleen and not any(a in bestand for a in alleen):
            continue
        bron, nieuw = importeer(pad)
        acts = {o.animation_data.action for o in nieuw if o.animation_data and o.animation_data.action}
        f0, f1 = retarget(doel, bron, bestand[:-4], kaart(soort))
        for o in nieuw:
            bpy.data.objects.remove(o)
        for a in acts:
            if a.users == 0:
                bpy.data.actions.remove(a)
        sc.frame_start, sc.frame_end = f0, f1
        for s in bpy.data.scenes:
            for o in s.objects:
                o.select_set(False)
        doel.select_set(True)
        bpy.context.view_layer.objects.active = doel
        bpy.ops.export_scene.gltf(filepath=KIST + bestand, export_format='GLB', use_selection=True, use_active_scene=True,
                                  export_animations=True, export_animation_mode='ACTIVE_ACTIONS')
        uit[bestand] = (f1 - f0 + 1, os.path.getsize(KIST + bestand))
    return uit
