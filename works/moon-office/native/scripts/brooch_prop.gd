extends Node3D
class_name BroochProp
## Procedural old-silver brooch. Local XY is the plate; +Z is the decorated
## front, -Z is the mechanism side. The crescent opens toward local +X.
## Plate bounds: X [-0.775, 0.775], Y [-0.8, 0.8], Z about [-0.06, 0.06].
## Gem and hinge project beyond the plate. This is a theatrical prop, not
## a certified, manufacturable jewellery mechanism.
## Godot 4.7: ArrayMesh clockwise faces, StandardMaterial3D, no CSG/shaders.

const HINGE_POSITION := Vector3(-0.56, -0.40, -0.102)
const SOCKET_POSITION := Vector3(-0.20, 0.38, -0.124)
const PIN_OPEN_ANGLE := deg_to_rad(62.0)
const NARROW_HOLE_SPACING := 0.18
const WIDE_HOLE_SPACING := 0.30
const ARC_STEPS := 208
const FACE_STEPS := 64

var _pin_amount := 0.0
var _clasp_present := false
var _built := false
var _silver: StandardMaterial3D
var _edge: StandardMaterial3D
var _dark_silver: StandardMaterial3D
var _bronze: StandardMaterial3D
var _gem: StandardMaterial3D
var _pin_pivot: Node3D
var _pin_tip: Marker3D
var _inserted: Node3D


func _ready() -> void:
	_build()


func set_pin_open(value: float) -> void:
	## 0 = needle seated at SOCKET_POSITION; 1 = 62 degrees away from the
	## plate toward -Z. The hinge axis lies in XY, perpendicular to the needle.
	## Safe before add_child(); no tween is created here, so callers can animate.
	_pin_amount = clampf(value, 0.0, 1.0)
	if _built:
		var closed := (SOCKET_POSITION - HINGE_POSITION).normalized()
		var axis := Vector3(-closed.y, closed.x, 0.0).normalized()
		_pin_pivot.quaternion = Quaternion(axis, _pin_amount * PIN_OPEN_ANGLE)


func set_clasp_inserted(inserted: bool) -> void:
	## Only controls the correct loose clasp's visibility; it does not close
	## the pin automatically. This keeps placement and actual latching separate.
	_clasp_present = inserted
	if _built:
		_inserted.visible = inserted


func get_socket_global_position() -> Vector3:
	## Centre of the insertion/catch throat, not either mounting hole.
	## Call after adding this prop to the tree. The inserted clasp's hole centres
	## are offsets (+/-0.09, +0.10, 0), parallel to the local X axis. Receiver
	## eyes are another +0.029 along Z, closer to the silver plate.
	return to_global(SOCKET_POSITION)


func get_pin_tip_global_position() -> Vector3:
	## The physical pointed end after hinge rotation. At pin_open=0 it agrees
	## with get_socket_global_position(), regardless of the prop's transform.
	_build()
	return _pin_tip.global_position


func create_clasp(kind: int) -> Node3D:
	## Returns an UNPARENTED piece at identity transform. Its local origin is
	## the catch throat; plane XY, outward display side -Z. Mounting holes are
	## at (+/-spacing/2, +0.10, 0). Align the returned root to SOCKET_POSITION.
	## 0: wide 0.30 spacing / square throat; 1: narrow 0.18 / round throat;
	## 2: narrow 0.18 / square throat (the fitting piece).
	_materials()
	var choice := clampi(kind, 0, 2)
	var spacing := WIDE_HOLE_SPACING if choice == 0 else NARROW_HOLE_SPACING
	var piece := Node3D.new()
	piece.name = "clasp_%d" % choice
	piece.set_meta("kind", choice)
	piece.set_meta("hole_spacing", spacing)
	piece.set_meta("notch_shape", "round" if choice == 1 else "square")
	piece.set_meta("hole_centres", PackedVector3Array([
		Vector3(-spacing * 0.5, 0.10, 0), Vector3(spacing * 0.5, 0.10, 0)]))
	# Annular solids: the holes remain genuinely empty through the full depth.
	for side in [-1.0, 1.0]:
		_ring(piece, "mounting_eye_%s" % side, Vector3(side * spacing * 0.5, 0.10, 0), 0.030, 0.053, 0.028, _silver)
	_box(piece, "waist", Vector3(0, 0.10, 0), Vector3(spacing - 0.078, 0.033, 0.026), 0.007, _silver)
	_box(piece, "neck", Vector3(0, 0.061, 0), Vector3(0.052, 0.056, 0.026), 0.006, _silver)
	if choice == 1:
		_ring(piece, "round_throat", Vector3(0, -0.006, 0), 0.025, 0.044, 0.028, _silver, 0.0, PI)
		for side in [-1.0, 1.0]:
			_box(piece, "round_leg_%s" % side, Vector3(side * 0.0345, -0.025, 0), Vector3(0.019, 0.043, 0.028), 0.004, _silver)
	else:
		_box(piece, "square_throat_roof", Vector3(0, 0.027, 0), Vector3(0.091, 0.024, 0.028), 0.003, _silver)
		for side in [-1.0, 1.0]:
			_box(piece, "square_leg_%s" % side, Vector3(side * 0.034, -0.011, 0), Vector3(0.023, 0.069, 0.028), 0.003, _silver)
	return piece


func _build() -> void:
	if _built:
		return
	_materials()
	var body := MeshInstance3D.new()
	body.name = "moon_body"
	body.mesh = _crescent_mesh()
	add_child(body)
	_make_stone()
	_make_hinge()
	_make_socket()
	_built = true
	set_pin_open(_pin_amount)
	set_clasp_inserted(_clasp_present)


func _materials() -> void:
	if _silver != null:
		return
	_silver = _metal(Color(0.66, 0.71, 0.70), 0.76, 0.32)
	_silver.vertex_color_use_as_albedo = true
	_edge = _metal(Color(0.80, 0.82, 0.79), 0.76, 0.25)
	_dark_silver = _metal(Color(0.31, 0.38, 0.36), 0.64, 0.44)
	_bronze = _metal(Color(0.49, 0.41, 0.27), 0.70, 0.38)
	_gem = StandardMaterial3D.new()
	_gem.albedo_color = Color(0.24, 0.38, 0.44, 0.62)
	_gem.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA_DEPTH_PRE_PASS
	_gem.roughness = 0.13
	_gem.metallic = 0.04
	_gem.metallic_specular = 0.86
	_gem.cull_mode = BaseMaterial3D.CULL_DISABLED


func _metal(color: Color, metalness: float, rough: float) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	material.metallic = metalness
	material.metallic_specular = 0.76
	material.roughness = rough
	return material


func _boundary(t: float, inner: bool) -> Vector2:
	var outer_start := deg_to_rad(50.0)
	var rx := 1.55 / (1.0 + cos(outer_start))
	var shift_x := (rx - rx * cos(outer_start)) * 0.5
	if not inner:
		var angle := lerpf(outer_start, TAU - outer_start, t)
		return Vector2(rx * cos(angle) + shift_x, 0.8 * sin(angle))
	var tip := Vector2(rx * cos(outer_start), 0.8 * sin(outer_start))
	var inner_start := acos((tip.x - 0.50) / 0.87)
	var inner_ry := tip.y / sin(inner_start)
	var angle := lerpf(inner_start, TAU - inner_start, t)
	return Vector2(0.50 + 0.87 * cos(angle) + shift_x, inner_ry * sin(angle))


func _groove(t: float, s: float, p: Vector2) -> float:
	# Actual shallow displacement into the front surface, not raised wire.
	var mask := smoothstep(0.12, 0.18, t) * (1.0 - smoothstep(0.80, 0.87, t))
	var line_a := 0.19 + 0.035 * sin(t * TAU * 1.35)
	var line_b := 0.76 - 0.035 * sin(t * TAU)
	var amount := exp(-pow((s - line_a) / 0.018, 2)) * mask
	amount += exp(-pow((s - line_b) / 0.015, 2)) * mask * 0.65
	for star in [Vector2(-0.45, 0.34), Vector2(-0.50, 0.10), Vector2(-0.44, -0.52)]:
		var relative: Vector2 = p - star
		var vertical := Vector2(relative.x, maxf(absf(relative.y) - 0.024, 0.0)).length()
		var horizontal := Vector2(maxf(absf(relative.x) - 0.018, 0.0), relative.y).length()
		amount = maxf(amount, exp(-pow(minf(vertical, horizontal) / 0.006, 2)))
	return clampf(amount, 0.0, 1.0)


func _surface_point(t: float, s: float, front: bool) -> Vector3:
	var outside := _boundary(t, false)
	var inside := _boundary(t, true)
	var p := outside.lerp(inside, s)
	var width := outside.distance_to(inside)
	var edge_distance := minf(s, 1.0 - s) * width
	var bevel := clampf(edge_distance / 0.026, 0.0, 1.0)
	var height := 0.035 + 0.023 * sqrt(maxf(0.0, 1.0 - pow(1.0 - bevel, 2)))
	height += sin(s * PI) * 0.002
	height *= minf(1.0, sqrt(maxf(0.0, sin(t * PI))) * 3.2)
	if front:
		height -= _groove(t, s, p) * 0.0034
	return Vector3(p.x, p.y, height if front else -height)


func _crescent_mesh() -> ArrayMesh:
	var result := ArrayMesh.new()
	for front in [true, false]:
		var vertices := PackedVector3Array()
		var normals := PackedVector3Array()
		var colors := PackedColorArray()
		var indices := PackedInt32Array()
		for row in range(ARC_STEPS + 1):
			var t := float(row) / ARC_STEPS
			for column in range(FACE_STEPS + 1):
				var s := float(column) / FACE_STEPS
				var point := _surface_point(t, s, front)
				vertices.append(point)
				var dt := _surface_point(minf(t + 0.0008, 1.0), s, front) - _surface_point(maxf(t - 0.0008, 0.0), s, front)
				var ds := _surface_point(t, minf(s + 0.0008, 1.0), front) - _surface_point(t, maxf(s - 0.0008, 0.0), front)
				var normal := dt.cross(ds).normalized()
				if normal.length_squared() < 0.1:
					normal = Vector3(0, 0, 1)
				normals.append(normal if front else -normal)
				var wear := 0.90 + 0.012 * sin(point.x * 9.0 + point.y * 13.0 + sin(point.y * 17.0))
				wear += 0.007 * sin(point.x * 31.0 - point.y * 23.0 + sin(point.x * 7.0))
				var groove := _groove(t, s, Vector2(point.x, point.y)) if front else 0.0
				var tint := Color(wear, wear, wear)
				tint = tint.lerp(Color(0.22, 0.29, 0.27), groove * 0.63)
				colors.append(tint)
		for row in range(ARC_STEPS):
			for column in range(FACE_STEPS):
				var a := row * (FACE_STEPS + 1) + column
				var b := a + FACE_STEPS + 1
				if front:
					indices.append_array(PackedInt32Array([a, a + 1, b, a + 1, b + 1, b]))
				else:
					indices.append_array(PackedInt32Array([a, b, a + 1, a + 1, b, b + 1]))
		_add_surface(result, vertices, normals, indices, colors, _silver)
	# Separate polished edge bands join the front and back bevels.
	for inner in [false, true]:
		var vertices := PackedVector3Array()
		var normals := PackedVector3Array()
		var indices := PackedInt32Array()
		var s := 1.0 if inner else 0.0
		for row in range(ARC_STEPS + 1):
			var t := float(row) / ARC_STEPS
			var direction := _boundary(minf(t + 0.001, 1.0), inner) - _boundary(maxf(t - 0.001, 0.0), inner)
			var normal := Vector3(direction.y, -direction.x, 0).normalized()
			if inner:
				normal = -normal
			vertices.append(_surface_point(t, s, true))
			vertices.append(_surface_point(t, s, false))
			normals.append(normal)
			normals.append(normal)
		for row in range(ARC_STEPS):
			var a := row * 2
			if inner:
				indices.append_array(PackedInt32Array([a, a + 1, a + 2, a + 1, a + 3, a + 2]))
			else:
				indices.append_array(PackedInt32Array([a, a + 2, a + 1, a + 1, a + 2, a + 3]))
		_add_surface(result, vertices, normals, indices, PackedColorArray(), _edge)
	return result


func _make_stone() -> void:
	var setting := Node3D.new()
	setting.name = "blue_grey_stone"
	setting.position = Vector3(-0.515, -0.235, 0.058)
	add_child(setting)
	_ring(setting, "silver_bezel", Vector3(0, 0, 0.006), 0.100, 0.123, 0.019, _edge)
	var mesh := ArrayMesh.new()
	var vertices := PackedVector3Array()
	var normals := PackedVector3Array()
	var indices := PackedInt32Array()
	var radii := [0.098, 0.104, 0.056]
	var heights := [-0.010, 0.013, 0.052]
	for ring in range(2):
		for i in range(12):
			var a := float(i) / 12.0 * TAU
			var b := float(i + 1) / 12.0 * TAU
			var p := Vector3(cos(a) * radii[ring], sin(a) * radii[ring], heights[ring])
			var q := Vector3(cos(b) * radii[ring], sin(b) * radii[ring], heights[ring])
			var r := Vector3(cos(a) * radii[ring + 1], sin(a) * radii[ring + 1], heights[ring + 1])
			var s := Vector3(cos(b) * radii[ring + 1], sin(b) * radii[ring + 1], heights[ring + 1])
			_quad(vertices, normals, indices, p, q, r, s)
	for i in range(12):
		var a := float(i) / 12.0 * TAU
		var b := float(i + 1) / 12.0 * TAU
		_triangle(vertices, normals, indices, Vector3(0, 0, 0.052), Vector3(cos(b) * 0.056, sin(b) * 0.056, 0.052), Vector3(cos(a) * 0.056, sin(a) * 0.056, 0.052), Vector3(0, 0, 1))
	_add_surface(mesh, vertices, normals, indices, PackedColorArray(), _gem)
	var stone := MeshInstance3D.new()
	stone.name = "faceted_translucent_stone"
	stone.mesh = mesh
	setting.add_child(stone)
	for i in range(4):
		var angle := i * PI * 0.5 + PI * 0.25
		var at := Vector3(cos(angle) * 0.109, sin(angle) * 0.109, 0.008)
		_rod(setting, "bezel_claw_%d" % i, at, at + Vector3(-cos(angle) * 0.012, -sin(angle) * 0.012, 0.021), 0.006, _silver)


func _make_hinge() -> void:
	var support := Node3D.new()
	support.name = "hinge_barrel"
	support.position = HINGE_POSITION
	add_child(support)
	var closed := (SOCKET_POSITION - HINGE_POSITION).normalized()
	var axis := Vector3(-closed.y, closed.x, 0).normalized()
	for side in [-1.0, 1.0]:
		var centre: Vector3 = axis * side * 0.038
		_box(support, "hinge_foot_%s" % side, centre + Vector3(0, 0, 0.027), Vector3(0.041, 0.048, 0.043), 0.009, _dark_silver)
		_rod(support, "barrel_segment_%s" % side, centre - axis * 0.019, centre + axis * 0.019, 0.024, _silver)
	_rod(support, "hinge_axle", -axis * 0.067, axis * 0.067, 0.011, _bronze)
	_pin_pivot = Node3D.new()
	_pin_pivot.name = "hinged_pin"
	_pin_pivot.position = HINGE_POSITION
	add_child(_pin_pivot)
	var endpoint := SOCKET_POSITION - HINGE_POSITION
	var direction := endpoint.normalized()
	_rod(_pin_pivot, "needle_shaft", direction * 0.022, endpoint - direction * 0.075, 0.010, _edge)
	_rod(_pin_pivot, "needle_point", endpoint - direction * 0.075, endpoint, 0.010, _silver, true)
	_rod(_pin_pivot, "moving_barrel", -axis * 0.018, axis * 0.018, 0.022, _edge)
	_pin_tip = Marker3D.new()
	_pin_tip.name = "pin_tip"
	_pin_tip.position = endpoint
	_pin_pivot.add_child(_pin_tip)


func _make_socket() -> void:
	var socket := Node3D.new()
	socket.name = "socket"
	socket.position = SOCKET_POSITION
	add_child(socket)
	# Raised, separate mounting eyes plus rounded feet. The centre and two
	# mounting bores remain open; the plate is visible deeper behind them.
	for side in [-1.0, 1.0]:
		_ring(socket, "socket_eye_%s" % side, Vector3(side * 0.09, 0.10, 0.029), 0.032, 0.057, 0.028, _dark_silver)
		_box(socket, "socket_foot_%s" % side, Vector3(side * 0.128, 0.10, 0.045), Vector3(0.031, 0.056, 0.048), 0.009, _silver)
	_box(socket, "catch_bridge", Vector3(0, 0.082, 0.027), Vector3(0.14, 0.028, 0.018), 0.007, _bronze)
	for side in [-1.0, 1.0]:
		_box(socket, "catch_guide_%s" % side, Vector3(side * 0.052, -0.006, 0.016), Vector3(0.023, 0.092, 0.033), 0.008, _dark_silver)
	_inserted = create_clasp(2)
	_inserted.name = "inserted_clasp"
	_inserted.position = SOCKET_POSITION
	add_child(_inserted)


func _box(parent: Node3D, label: String, at: Vector3, size: Vector3, bevel: float, material: Material) -> void:
	var mesh := ArrayMesh.new()
	var vertices := PackedVector3Array()
	var normals := PackedVector3Array()
	var indices := PackedInt32Array()
	var half := size * 0.5
	var core := half - Vector3.ONE * bevel
	for axis in range(3):
		for sign_value in [-1.0, 1.0]:
			var u := (axis + 1) % 3
			var v := (axis + 2) % 3
			var coordinates_u := [-half[u], -core[u], 0.0, core[u], half[u]]
			var coordinates_v := [-half[v], -core[v], 0.0, core[v], half[v]]
			var base := vertices.size()
			for row in range(5):
				for column in range(5):
					var p := Vector3.ZERO
					p[axis] = half[axis] * sign_value
					p[u] = coordinates_u[column]
					p[v] = coordinates_v[row]
					var closest := p.clamp(-core, core)
					var normal := (p - closest).normalized()
					vertices.append(closest + normal * bevel)
					normals.append(normal)
			for row in range(4):
				for column in range(4):
					var a := base + row * 5 + column
					if sign_value > 0:
						indices.append_array(PackedInt32Array([a, a + 5, a + 1, a + 1, a + 5, a + 6]))
					else:
						indices.append_array(PackedInt32Array([a, a + 1, a + 5, a + 1, a + 6, a + 5]))
	_add_surface(mesh, vertices, normals, indices, PackedColorArray(), material)
	var instance := MeshInstance3D.new()
	instance.name = label
	instance.position = at
	instance.mesh = mesh
	parent.add_child(instance)


func _rod(parent: Node3D, label: String, start: Vector3, end: Vector3, radius: float, material: Material, pointed: bool = false) -> void:
	var mesh := CylinderMesh.new()
	mesh.height = start.distance_to(end)
	mesh.bottom_radius = radius
	mesh.top_radius = 0.0002 if pointed else radius
	mesh.radial_segments = 20
	var instance := MeshInstance3D.new()
	instance.name = label
	instance.mesh = mesh
	instance.material_override = material
	instance.position = (start + end) * 0.5
	instance.quaternion = Quaternion(Vector3.UP, (end - start).normalized())
	parent.add_child(instance)


func _ring(parent: Node3D, label: String, at: Vector3, inner: float, outer: float, depth: float, material: Material, start_angle: float = 0.0, end_angle: float = TAU) -> void:
	var mesh := ArrayMesh.new()
	var vertices := PackedVector3Array()
	var normals := PackedVector3Array()
	var indices := PackedInt32Array()
	var b := minf(0.005, minf((outer - inner) * 0.22, depth * 0.20))
	# A closed octagonal radial section produces real inner walls and bevels.
	var section := [Vector2(inner, -depth * 0.5 + b), Vector2(inner + b, -depth * 0.5), Vector2(outer - b, -depth * 0.5), Vector2(outer, -depth * 0.5 + b), Vector2(outer, depth * 0.5 - b), Vector2(outer - b, depth * 0.5), Vector2(inner + b, depth * 0.5), Vector2(inner, depth * 0.5 - b)]
	var segments := 48
	for i in range(segments):
		var a := lerpf(start_angle, end_angle, float(i) / segments)
		var c := lerpf(start_angle, end_angle, float(i + 1) / segments)
		for j in range(section.size()):
			var p: Vector2 = section[j]
			var q: Vector2 = section[(j + 1) % section.size()]
			_quad(vertices, normals, indices, Vector3(cos(a) * p.x, sin(a) * p.x, p.y), Vector3(cos(c) * p.x, sin(c) * p.x, p.y), Vector3(cos(a) * q.x, sin(a) * q.x, q.y), Vector3(cos(c) * q.x, sin(c) * q.x, q.y))
	if end_angle - start_angle < TAU - 0.01:
		for angle in [start_angle, end_angle]:
			var normal := Vector3(sin(angle), -cos(angle), 0)
			if angle == end_angle:
				normal = -normal
			var centre := Vector3(cos(angle) * (inner + outer) * 0.5, sin(angle) * (inner + outer) * 0.5, 0)
			for j in range(section.size()):
				var p: Vector2 = section[j]
				var q: Vector2 = section[(j + 1) % section.size()]
				_triangle(vertices, normals, indices, centre, Vector3(cos(angle) * p.x, sin(angle) * p.x, p.y), Vector3(cos(angle) * q.x, sin(angle) * q.x, q.y), normal)
	_add_surface(mesh, vertices, normals, indices, PackedColorArray(), material)
	var instance := MeshInstance3D.new()
	instance.name = label
	instance.mesh = mesh
	instance.position = at
	parent.add_child(instance)


func _quad(vertices: PackedVector3Array, normals: PackedVector3Array, indices: PackedInt32Array, a: Vector3, b: Vector3, c: Vector3, d: Vector3) -> void:
	var normal := (b - a).cross(c - a).normalized()
	_triangle(vertices, normals, indices, a, b, c, normal)
	_triangle(vertices, normals, indices, b, d, c, normal)


func _triangle(vertices: PackedVector3Array, normals: PackedVector3Array, indices: PackedInt32Array, a: Vector3, b: Vector3, c: Vector3, normal: Vector3) -> void:
	var base := vertices.size()
	vertices.append(a)
	vertices.append(b)
	vertices.append(c)
	normals.append(normal)
	normals.append(normal)
	normals.append(normal)
	if (b - a).cross(c - a).dot(normal) > 0.0:
		indices.append_array(PackedInt32Array([base, base + 2, base + 1]))
	else:
		indices.append_array(PackedInt32Array([base, base + 1, base + 2]))


func _add_surface(mesh: ArrayMesh, vertices: PackedVector3Array, normals: PackedVector3Array, indices: PackedInt32Array, colors: PackedColorArray, material: Material) -> void:
	var arrays: Array = []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = vertices
	arrays[Mesh.ARRAY_NORMAL] = normals
	arrays[Mesh.ARRAY_INDEX] = indices
	if not colors.is_empty():
		arrays[Mesh.ARRAY_COLOR] = colors
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	mesh.surface_set_material(mesh.get_surface_count() - 1, material)
