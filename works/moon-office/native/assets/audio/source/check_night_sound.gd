extends SceneTree
## Run in a temporary project containing the native assets/scripts.
## AudioServer Dummy exercises playback; this is not a listening test.

var checks: Array[String] = []


func _initialize() -> void:
	call_deferred("_run")


func check(value: bool, label: String) -> void:
	if not value:
		push_error("Audio verification failed: " + label)
		quit(1)
		return
	checks.append(label)


func _run() -> void:
	var recorder := AudioEffectRecord.new()
	AudioServer.add_bus_effect(0, recorder)
	recorder.set_recording_active(true)
	var sound = load("res://scripts/night_sound.gd").new()
	sound.set_enabled(false)
	sound.set_state("hold")
	root.add_child(sound)
	await process_frame
	check(not sound._music_player.playing, "disabled before ready does not start playback")
	check(sound._state == "hold", "state before ready is retained")
	sound.set_enabled(true)
	await create_timer(0.2).timeout
	check(sound._music_player.playing, "enabling starts synchronized stream")
	check(sound._synchronized.stream_count == 3, "three synchronized music states")
	for i in range(3):
		var stream: AudioStreamOggVorbis = sound._synchronized.get_sync_stream(i)
		check(stream.loop and absf(stream.get_length() - 46.0) < 0.001, "state %d is a 46-second loop" % i)
	sound.play_cue("pickup")
	var first_time: int = sound._last_cue_ms["pickup"]
	sound.play_cue("pickup")
	check(sound._last_cue_ms["pickup"] == first_time, "repeated pickup is throttled")
	var active := 0
	for voice in sound._voices:
		if voice.playing:
			active += 1
	check(active == 1, "throttled pickup does not add an overlapping voice")
	sound.play_cue("clasp")
	sound.play_cue("clasp")
	active = 0
	for voice in sound._voices:
		if voice.playing and voice.stream == sound.CUES["clasp"]:
			active += 1
	check(active == 1, "one immediate clasp request produces one latch cue")
	await create_timer(2.0).timeout
	sound.set_state("resolve")
	await create_timer(0.3).timeout
	var before: PackedFloat32Array = sound._weights.duplicate()
	sound.set_state("observe")
	check(sound._weights == before, "interrupting a crossfade does not jump current gains")
	await create_timer(2.6).timeout
	check(sound._weights[0] > 0.999 and sound._weights[1] < 0.001 and sound._weights[2] < 0.001, "rapid state changes settle on the last requested state")
	var position_before: float = sound._music_player.get_playback_position()
	sound.set_enabled(false)
	sound.play_cue("blocked")
	await create_timer(0.2).timeout
	check(sound._master_gain == 0.0, "mute ramp reaches zero")
	check(not sound._last_cue_ms.has("blocked"), "muted action does not play a cue")
	check(sound._music_player.playing and sound._music_player.get_playback_position() > position_before, "mute preserves the shared musical timeline")
	for voice in sound._voices:
		check(not voice.playing, "muted material voice is stopped")
	sound.set_state("resolve")
	sound.set_enabled(true)
	await create_timer(3.0).timeout
	check(sound._master_gain > 0.999 and sound._weights[2] > 0.999, "unmute preserves and reaches the requested state")
	for cue in ["blocked", "cloth", "drawer_open", "drawer_close", "lamp"]:
		sound.play_cue(cue)
		check(sound._last_cue_ms.has(cue), "material cue loads and plays: " + cue)
		await create_timer(1.25).timeout
	# Wait past one full loop; this validates native runtime looping, not ears.
	await create_timer(33.0).timeout
	check(sound._music_player.playing, "music continues after the first 46-second cycle")
	recorder.set_recording_active(false)
	var capture: AudioStreamWAV = recorder.get_recording()
	check(capture.get_length() > 46.0, "Godot master-bus capture spans a complete loop")
	capture.save_to_wav("user://audio-runtime-mix.wav")
	AudioServer.remove_bus_effect(0, 0)
	var result := {"engine": Engine.get_version_info().string, "audio_driver": AudioServer.get_driver_name(),
		"checks": checks, "passed": true, "human_listening_performed": false,
		"runtime_recording_seconds": capture.get_length()}
	var result_file := FileAccess.open("user://audio-runtime-validation.json", FileAccess.WRITE)
	result_file.store_string(JSON.stringify(result, "\t") + "\n")
	print(JSON.stringify(result))
	print("Audio validation record: " + ProjectSettings.globalize_path("user://audio-runtime-validation.json"))
	sound.queue_free()
	await create_timer(0.2).timeout
	quit()
