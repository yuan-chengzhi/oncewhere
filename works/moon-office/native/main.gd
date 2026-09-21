extends Node2D
## A small, self-contained scene for comparing continuous object motion and
## performed puppet gestures. All generation work stays outside the runtime;
## the exported program only reads the prepared PNG, OGG and WAV assets.

const VIEW_SIZE := Vector2(1280, 800)
const BG_SIZE := Vector2(1586, 992)
const PUPPET_SCALE := 0.47
const FOX_ROOT := Vector2(315, 594)
const DOG_ROOT := Vector2(965, 594)
const STAGE_RECT := Rect2(392, 118, 496, 440)

var _background: Texture2D
var _fox_texture: Texture2D
var _dog_texture: Texture2D
var _fox: Node2D
var _dog: Node2D
var _fox_arms: Dictionary = {}
var _dog_arms: Dictionary = {}
var _lamp_position := Vector2(430, 600)
var _lamp_target := Vector2(430, 600)
var _lamp_progress := 0.0
var _lamp_handoff := false
var _lamp_visual: Node2D
var _brooch: BroochProp
var _brooch_world: Node3D
var _subviewport: SubViewport
var _selected_clasp := 0
var _clasp: Node3D
var _pin_open := 0.0
var _brooch_yaw := 0.0
var _dragging := false
var _last_mouse := Vector2.ZERO
var _resolved := false
var _sound: NightSound
var _status := "The moon has arrived with one stubborn hinge."
var _status_kind := "quiet"
var _step := 0
var _status_label: Label
var _step_label: Label
var _clasp_label: Label
var _hint_label: Label
var _sound_label: Label
var _title_label: Label
var _dialogue_label: Label
var _flash := 0.0
var _pulse := 0.0
var _font_color := Color("d8e4dc")
var _muted := false
var _closing := false

const FOX_PARTS := {
	"head": {"rect": Rect2(102, 8, 427, 508), "pivot": Vector2(310, 463), "anchor": Vector2(310, 463), "anchors": {"neck": Vector2(310, 463)}},
	"torso": {"rect": Rect2(582, 36, 434, 481), "pivot": Vector2(799, 300), "anchor": Vector2(799, 300), "anchors": {"neck": Vector2(790, 85), "shoulder_left": Vector2(643, 171), "shoulder_right": Vector2(942, 170)}},
	"upper_left": {"rect": Rect2(1170, 65, 227, 434), "pivot": Vector2(1246, 123), "anchor": Vector2(1246, 123), "anchors": {"elbow": Vector2(1270, 459)}},
	"upper_right": {"rect": Rect2(177, 535, 244, 426), "pivot": Vector2(296, 582), "anchor": Vector2(296, 582), "anchors": {"elbow": Vector2(298, 925)}},
	"forearm_left": {"rect": Rect2(671, 532, 301, 443), "pivot": Vector2(766, 579), "anchor": Vector2(766, 579), "anchors": {"elbow": Vector2(766, 579)}},
	"forearm_right": {"rect": Rect2(1077, 534, 293, 454), "pivot": Vector2(1268, 582), "anchor": Vector2(1268, 582), "anchors": {"elbow": Vector2(1268, 582)}},
}
const DOG_PARTS := {
	"head": {"rect": Rect2(78, 39, 465, 451), "pivot": Vector2(313, 445), "anchor": Vector2(313, 445), "anchors": {"neck": Vector2(313, 445)}},
	"torso": {"rect": Rect2(618, 14, 420, 505), "pivot": Vector2(826, 300), "anchor": Vector2(826, 300), "anchors": {"neck": Vector2(829, 72), "shoulder_left": Vector2(649, 161), "shoulder_right": Vector2(1001, 166)}},
	"upper_left": {"rect": Rect2(1187, 63, 246, 421), "pivot": Vector2(1290, 121), "anchor": Vector2(1290, 121), "anchors": {"elbow": Vector2(1319, 451)}},
	"upper_right": {"rect": Rect2(148, 537, 243, 440), "pivot": Vector2(279, 586), "anchor": Vector2(279, 586), "anchors": {"elbow": Vector2(287, 944)}},
	"forearm_left": {"rect": Rect2(660, 524, 337, 464), "pivot": Vector2(764, 573), "anchor": Vector2(764, 573), "anchors": {"elbow": Vector2(764, 573)}},
	"forearm_right": {"rect": Rect2(1093, 524, 296, 471), "pivot": Vector2(1265, 574), "anchor": Vector2(1265, 574), "anchors": {"elbow": Vector2(1265, 574)}},
}

func _ready() -> void:
	get_tree().auto_accept_quit = false
	_background = load("res://assets/art/office-background.png")
	_fox_texture = load("res://assets/art/fox-puppet-atlas.png")
	_dog_texture = load("res://assets/art/dog-puppet-atlas.png")
	_build_background()
	_build_puppets()
	_build_stage()
	_lamp_visual = preload("res://lamp_visual.gd").new()
	_lamp_visual.name = "ForegroundLamp"
	_lamp_visual.position = _lamp_position
	_lamp_visual.z_index = 40
	add_child(_lamp_visual)
	_build_ui()
	_sound = NightSound.new()
	_sound.name = "NightSound"
	add_child(_sound)
	_sound.set_state("observe")
	queue_redraw()

func _build_background() -> void:
	var plate := Sprite2D.new()
	plate.name = "OfficeBackdrop"
	plate.texture = _background
	plate.position = VIEW_SIZE * 0.5
	plate.scale = Vector2(VIEW_SIZE.x / BG_SIZE.x, VIEW_SIZE.y / BG_SIZE.y)
	plate.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	add_child(plate)
	move_child(plate, 0)

func _build_puppets() -> void:
	_fox = _make_puppet("Fox", _fox_texture, FOX_PARTS, FOX_ROOT, false, _fox_arms)
	_dog = _make_puppet("Dog", _dog_texture, DOG_PARTS, DOG_ROOT, true, _dog_arms)
	# Both workers begin in a waiting pose. Their forearms can be posed around
	# their own pivots, so the lamp can remain a single object between hands.
	_pose_arm(_fox_arms, "left", -0.08, 0.02)
	_pose_arm(_fox_arms, "right", 0.23, 0.05)
	_pose_arm(_dog_arms, "left", -0.14, -0.02)
	_pose_arm(_dog_arms, "right", 0.12, 0.02)

func _make_puppet(label: String, texture: Texture2D, parts: Dictionary, root_position: Vector2, mirror: bool, arm_store: Dictionary) -> Node2D:
	var puppet := Node2D.new()
	puppet.name = label + "Puppet"
	puppet.position = root_position
	puppet.scale = Vector2(-PUPPET_SCALE if mirror else PUPPET_SCALE, PUPPET_SCALE)
	add_child(puppet)
	var torso_pivot: Vector2 = parts["torso"]["pivot"]
	# Draw the torso first, then upper arm, forearm, head. Sprite regions keep
	# transparent gaps while each joint node retains a stable local pivot.
	var order := ["torso", "upper_left", "upper_right", "forearm_left", "forearm_right", "head"]
	for part_name in order:
		var data: Dictionary = parts[part_name]
		var pivot: Vector2 = data["pivot"]
		var rect: Rect2 = data["rect"]
		var joint := Node2D.new()
		joint.name = part_name + "Joint"
		var joint_position := pivot - torso_pivot
		var torso_anchors: Dictionary = parts["torso"]["anchors"]
		var own_anchors: Dictionary = data["anchors"]
		match part_name:
			"head":
				joint_position = torso_anchors["neck"] - torso_pivot - own_anchors["neck"] + pivot
			"upper_left":
				joint_position = torso_anchors["shoulder_right"] - torso_pivot - data["anchor"] + pivot
			"upper_right":
				joint_position = torso_anchors["shoulder_left"] - torso_pivot - data["anchor"] + pivot
			"forearm_left":
				joint_position = (torso_anchors["shoulder_right"] - torso_pivot - parts["upper_left"]["anchor"] + parts["upper_left"]["pivot"]) + parts["upper_left"]["anchors"]["elbow"] - parts["upper_left"]["pivot"] - own_anchors["elbow"] + pivot
			"forearm_right":
				joint_position = (torso_anchors["shoulder_left"] - torso_pivot - parts["upper_right"]["anchor"] + parts["upper_right"]["pivot"]) + parts["upper_right"]["anchors"]["elbow"] - parts["upper_right"]["pivot"] - own_anchors["elbow"] + pivot
		joint.position = joint_position
		puppet.add_child(joint)
		var sprite := Sprite2D.new()
		sprite.name = part_name + "Piece"
		sprite.texture = texture
		sprite.region_enabled = true
		sprite.region_rect = rect
		sprite.centered = false
		sprite.position = rect.position - pivot
		sprite.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
		joint.add_child(sprite)
		if part_name.begins_with("upper") or part_name.begins_with("forearm"):
			arm_store[part_name] = joint
	return puppet

func _pose_arm(arms: Dictionary, side: String, upper_angle: float, forearm_angle: float) -> void:
	var upper_key := "upper_" + side
	var forearm_key := "forearm_" + side
	if arms.has(upper_key):
		arms[upper_key].rotation = upper_angle
	if arms.has(forearm_key):
		arms[forearm_key].rotation = forearm_angle

func _build_stage() -> void:
	_subviewport = SubViewport.new()
	_subviewport.name = "BroochViewport"
	_subviewport.size = Vector2i(496, 440)
	_subviewport.transparent_bg = true
	_subviewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	_subviewport.msaa_3d = Viewport.MSAA_2X
	var view_container := SubViewportContainer.new()
	view_container.name = "ContinuousBroochStage"
	view_container.position = STAGE_RECT.position
	view_container.size = STAGE_RECT.size
	view_container.mouse_filter = Control.MOUSE_FILTER_IGNORE
	view_container.stretch = true
	view_container.add_child(_subviewport)
	add_child(view_container)
	_brooch_world = Node3D.new()
	_brooch_world.name = "BroochWorld"
	_subviewport.add_child(_brooch_world)
	var camera := Camera3D.new()
	camera.name = "CloseCamera"
	camera.position = Vector3(0, 0, 3.65)
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 2.55
	camera.current = true
	_brooch_world.add_child(camera)
	var key_light := DirectionalLight3D.new()
	key_light.rotation_degrees = Vector3(-35, -28, 0)
	key_light.light_energy = 1.15
	key_light.shadow_enabled = true
	_brooch_world.add_child(key_light)
	var fill := DirectionalLight3D.new()
	fill.rotation_degrees = Vector3(-10, 155, 0)
	fill.light_color = Color("8ba8ac")
	fill.light_energy = 0.42
	_brooch_world.add_child(fill)
	_brooch = BroochProp.new()
	_brooch.name = "MoonBrooch"
	_brooch.scale = Vector3(1.18, 1.18, 1.18)
	_brooch.rotation_degrees = Vector3(-4, 0, 0)
	_brooch_world.add_child(_brooch)
	_clasp = _brooch.create_clasp(_selected_clasp)
	_clasp.name = "LooseClasp"
	_clasp.position = BroochProp.SOCKET_POSITION + Vector3(0, 0, 0.052)
	_brooch.add_child(_clasp)

func _build_ui() -> void:
	var layer := CanvasLayer.new()
	layer.name = "TheatreUI"
	add_child(layer)
	_title_label = _label("MOON OFFICE / REPAIR STUDY", Vector2(42, 30), 24, Color("e7eee6"))
	layer.add_child(_title_label)
	var rule := ColorRect.new()
	rule.position = Vector2(42, 68)
	rule.size = Vector2(1196, 1)
	rule.color = Color(0.75, 0.84, 0.77, 0.35)
	layer.add_child(rule)
	var left_caption := _label("FOX / KEEPING WATCH", Vector2(118, 350), 13, Color("c3d5cd"))
	layer.add_child(left_caption)
	var right_caption := _label("DOG / LAST CHECK", Vector2(880, 350), 13, Color("c3d5cd"))
	layer.add_child(right_caption)
	_dialogue_label = _label("\"It catches when I turn it too quickly.\"", Vector2(46, 678), 17, Color("f1e7d3"))
	layer.add_child(_dialogue_label)
	_status_label = _label(_status, Vector2(46, 706), 14, Color("b8cbc0"))
	_status_label.size = Vector2(740, 28)
	layer.add_child(_status_label)
	_step_label = _label("SCENE 01  /  OBSERVE", Vector2(1012, 31), 13, Color("b8cbc0"))
	layer.add_child(_step_label)
	_clasp_label = _label("LOOSE CLASP  A / WIDE SQUARE", Vector2(918, 690), 13, Color("f0d6a3"))
	_clasp_label.size = Vector2(300, 28)
	layer.add_child(_clasp_label)
	_hint_label = _label("R turn  ·  1/2/3 choose  ·  SPACE try fit  ·  L pass lamp  ·  M mute", Vector2(46, 758), 12, Color("91a69c"))
	layer.add_child(_hint_label)
	_sound_label = _label("♪ ADAPTIVE SCORE / OBSERVE", Vector2(918, 720), 12, Color("9fb9ae"))
	layer.add_child(_sound_label)

func _label(text_value: String, at: Vector2, font_size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = text_value
	label.position = at
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.5))
	label.add_theme_constant_override("shadow_offset_x", 1)
	label.add_theme_constant_override("shadow_offset_y", 2)
	return label

func _process(delta: float) -> void:
	if _closing:
		return
	_pulse += delta
	_flash = maxf(0.0, _flash - delta)
	if not is_zero_approx(_lamp_position.distance_to(_lamp_target)):
		_lamp_position = _lamp_position.lerp(_lamp_target, minf(1.0, delta * 2.1))
		_lamp_visual.position = _lamp_position
		queue_redraw()
	if _lamp_handoff:
		var wave := sin(_pulse * 1.8) * 0.025
		_pose_arm(_fox_arms, "right", lerpf(0.23, 0.38, _lamp_progress), 0.05 + wave)
		_pose_arm(_dog_arms, "left", lerpf(-0.14, -0.42, _lamp_progress), -0.02 - wave)
	if _status_label:
		_status_label.text = _status
	if _flash > 0.0:
		queue_redraw()

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		_graceful_quit()

func _graceful_quit() -> void:
	if _closing:
		return
	_closing = true
	# Procedural meshes, synchronized audio streams and the SubViewport all own
	# native resources. Release the scene tree for one frame before quitting so
	# a portable build closes without leaving those objects alive at shutdown.
	for child in get_children():
		child.queue_free()
	await get_tree().process_frame
	await get_tree().create_timer(0.25).timeout
	get_tree().quit()

func _draw() -> void:
	# A restrained theatre frame turns the generated background into a stage.
	draw_rect(Rect2(0, 0, VIEW_SIZE.x, 86), Color(0.025, 0.045, 0.052, 0.82))
	draw_rect(Rect2(0, 650, VIEW_SIZE.x, 150), Color(0.025, 0.045, 0.052, 0.88))
	draw_line(Vector2(42, 648), Vector2(1238, 648), Color(0.74, 0.82, 0.74, 0.28), 1.0)
	# Thin copper brackets make the 3D close-up legible without masking it.
	var c := Color(0.78, 0.58, 0.32, 0.62)
	var r := STAGE_RECT.grow(8.0)
	draw_line(r.position, r.position + Vector2(30, 0), c, 2)
	draw_line(r.position, r.position + Vector2(0, 30), c, 2)
	draw_line(Vector2(r.end.x, r.position.y), Vector2(r.end.x - 30, r.position.y), c, 2)
	draw_line(Vector2(r.end.x, r.position.y), Vector2(r.end.x, r.position.y + 30), c, 2)
	draw_line(Vector2(r.position.x, r.end.y), Vector2(r.position.x + 30, r.end.y), c, 2)
	draw_line(Vector2(r.position.x, r.end.y), Vector2(r.position.x, r.end.y - 30), c, 2)
	draw_line(r.end, r.end - Vector2(30, 0), c, 2)
	draw_line(r.end, r.end - Vector2(0, 30), c, 2)
	if _flash > 0.0:
		draw_circle(Vector2(640, 337), 120.0 * _flash, Color(1.0, 0.85, 0.52, 0.08 * _flash))

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		match event.keycode:
			KEY_R:
				_turn_brooch()
			KEY_1, KEY_2, KEY_3:
				_select_clasp(event.keycode - KEY_1)
			KEY_SPACE:
				_try_fit()
			KEY_L:
				_pass_lamp()
			KEY_M:
				_toggle_mute()
			KEY_ESCAPE:
				_graceful_quit()
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed and STAGE_RECT.grow(24).has_point(event.position):
			_dragging = true
			_last_mouse = event.position
		elif not event.pressed:
			_dragging = false
	if event is InputEventMouseMotion and _dragging:
		var movement: Vector2 = (event as InputEventMouseMotion).position - _last_mouse
		_last_mouse = event.position
		_brooch_yaw = clampf(_brooch_yaw + movement.x * 0.55, -48.0, 48.0)
		_brooch.rotation_degrees.y = _brooch_yaw
		_brooch.rotation_degrees.x = clampf(_brooch.rotation_degrees.x + movement.y * 0.15, -20.0, 20.0)

func _turn_brooch() -> void:
	_pin_open = 1.0 - _pin_open
	var target_yaw := 150.0 if _pin_open > 0.5 else 0.0
	var tween := create_tween()
	tween.set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN_OUT)
	tween.tween_method(_set_pin_amount, 1.0 - _pin_open, _pin_open, 0.62)
	tween.parallel().tween_method(_set_brooch_yaw, _brooch_yaw, target_yaw, 0.62)
	_sound.play_cue("pickup")
	_sound.set_state("hold")
	_status = "The needle turns on its hinge. The socket is waiting on the back."
	_status_kind = "hold"
	_step = 1
	_step_label.text = "SCENE 02  /  HOLD"
	_dialogue_label.text = "\"Hold the light steady while I find the catch.\""

func _set_pin_amount(value: float) -> void:
	_brooch.set_pin_open(value)
	queue_redraw()

func _set_brooch_yaw(value: float) -> void:
	_brooch_yaw = value
	_brooch.rotation_degrees.y = value

func _select_clasp(kind: int) -> void:
	_selected_clasp = clampi(kind, 0, 2)
	if is_instance_valid(_clasp):
		_clasp.queue_free()
	_clasp = _brooch.create_clasp(_selected_clasp)
	_clasp.name = "LooseClasp"
	_clasp.position = BroochProp.SOCKET_POSITION + Vector3(0, 0, 0.052)
	_brooch.add_child(_clasp)
	var names := ["A / WIDE SQUARE", "B / NARROW ROUND", "C / NARROW SQUARE"]
	_clasp_label.text = "LOOSE CLASP  " + names[_selected_clasp]
	_status = "Try it gently. A wrong throat stops at the first contact."
	_status_kind = "quiet"
	_sound.play_cue("cloth")

func _try_fit() -> void:
	if _selected_clasp != 2:
		_sound.play_cue("blocked")
		_status = "It meets the guide and stops. The shape is wrong; nothing is forced."
		_status_kind = "blocked"
		_flash = 0.25
		_dialogue_label.text = "\"No. That little resistance is an answer.\""
		_sound.set_state("hold")
		return
	if _pin_open < 0.76:
		_sound.play_cue("blocked")
		_status = "The clasp is right, but the needle is still covering its throat. Turn the moon first."
		_status_kind = "blocked"
		return
	_brooch.set_clasp_inserted(true)
	_resolved = true
	_step = 2
	_step_label.text = "SCENE 03  /  RESOLVE"
	_status = "The square throat receives both eyes. One clean click, then the hands can let go."
	_status_kind = "resolved"
	_dialogue_label.text = "\"There. You felt it close too.\""
	_sound.play_cue("clasp")
	_sound.set_state("resolve")
	_flash = 0.85
	_lamp_handoff = true
	_pass_lamp()

func _pass_lamp() -> void:
	_lamp_handoff = true
	_lamp_progress = 0.0 if not _lamp_handoff else _lamp_progress
	_lamp_target = Vector2(830, 600)
	var tween := create_tween()
	tween.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN_OUT)
	tween.tween_property(self, "_lamp_progress", 1.0, 2.4)
	tween.parallel().tween_method(_set_lamp_target, _lamp_position, _lamp_target, 2.4)
	_sound.play_cue("lamp")
	_sound.set_state("resolve" if _resolved else "hold")
	_status = "The lamp crosses the counter. A held object gives the silence a second rhythm."
	_status_kind = "resolved" if _resolved else "hold"
	_dialogue_label.text = "\"Your turn to carry the small light home.\""

func _set_lamp_target(position: Vector2) -> void:
	_lamp_position = position
	_lamp_visual.position = position
	queue_redraw()

func _toggle_mute() -> void:
	_muted = not _muted
	_sound.set_enabled(not _muted)
	_sound_label.text = "♪ SCORE / MUTED" if _muted else "♪ ADAPTIVE SCORE / " + ("RESOLVE" if _resolved else "HOLD")
	_status = "The room keeps moving without sound." if _muted else "The room lets the material sounds return."
