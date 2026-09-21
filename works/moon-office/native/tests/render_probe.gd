extends SceneTree

func _initialize() -> void:
	var world := Node3D.new()
	root.add_child(world)
	var camera := Camera3D.new()
	world.add_child(camera)
	camera.position = Vector3(0, 0, 4)
	camera.current = true
	var box := MeshInstance3D.new()
	box.mesh = BoxMesh.new()
	box.rotation = Vector3(0.3, 0.5, 0.1)
	world.add_child(box)
	var material := StandardMaterial3D.new()
	material.albedo_color = Color(0.9, 0.6, 0.25)
	box.material_override = material
	var light := DirectionalLight3D.new()
	light.rotation_degrees = Vector3(-30, -30, 0)
	world.add_child(light)
	_capture.call_deferred()

func _capture() -> void:
	for frame in range(8):
		await process_frame
	await RenderingServer.frame_post_draw
	var target := OS.get_environment("ONCEWHERE_PROBE_IMAGE")
	var image := root.get_texture().get_image()
	var result := image.save_png(target)
	print("RENDER_PROBE ", JSON.stringify({"renderer": RenderingServer.get_current_rendering_method(), "driver": RenderingServer.get_current_rendering_driver_name(), "adapter": RenderingServer.get_video_adapter_name(), "width": image.get_width(), "height": image.get_height(), "save_error": result}))
	quit(0 if result == OK else 1)
