extends Node
class_name NightSound
## Material sounds and a common musical timeline for the repair/lamp scene.
## No UI clicks. The scene calls "clasp" only when the latch actually closes.

const STATE_NAMES: Array[String] = ["observe", "hold", "resolve"]
const MUSIC: Array[AudioStreamOggVorbis] = [
	preload("res://assets/audio/music-observe.ogg"),
	preload("res://assets/audio/music-hold.ogg"),
	preload("res://assets/audio/music-resolve.ogg"),
]
const CUES: Dictionary = {
	"pickup": preload("res://assets/audio/pickup.wav"),
	"blocked": preload("res://assets/audio/blocked.wav"),
	"clasp": preload("res://assets/audio/clasp.wav"),
	"cloth": preload("res://assets/audio/cloth.wav"),
	"drawer_open": preload("res://assets/audio/drawer_open.wav"),
	"drawer_close": preload("res://assets/audio/drawer_close.wav"),
	"lamp": preload("res://assets/audio/lamp.wav"),
}
const COOLDOWNS: Dictionary = {
	"pickup": 0.30, "blocked": 0.65, "clasp": 1.20, "cloth": 0.80,
	"drawer_open": 1.10, "drawer_close": 0.90, "lamp": 0.60,
}
const MUSIC_GAIN_DB := -3.0
const CUE_GAIN_DB := -1.0
const SILENT_DB := -80.0

var _state := "observe"
var _enabled := true
var _built := false
var _started := false
var _master_gain := 0.0
var _music_player: AudioStreamPlayer
var _synchronized: AudioStreamSynchronized
var _voices: Array[AudioStreamPlayer] = []
var _last_cue_ms: Dictionary = {}
var _weights := PackedFloat32Array([0.0, 0.0, 0.0])
var _fade_from := PackedFloat32Array([0.0, 0.0, 0.0])
var _fade_target := PackedFloat32Array([1.0, 0.0, 0.0])
var _fade_elapsed := 0.0
var _fade_duration := 2.4


func _ready() -> void:
	# A synchronized resource starts all three files on the same sample frame.
	# Silent states keep their musical position through switching and muting.
	_synchronized = AudioStreamSynchronized.new()
	_synchronized.stream_count = MUSIC.size()
	for i in range(MUSIC.size()):
		var stream := MUSIC[i].duplicate() as AudioStreamOggVorbis
		stream.loop = true
		stream.loop_offset = 0.0
		_synchronized.set_sync_stream(i, stream)
		_synchronized.set_sync_stream_volume(i, SILENT_DB)
	_music_player = AudioStreamPlayer.new()
	_music_player.name = "SharedMusicTimeline"
	_music_player.stream = _synchronized
	_music_player.volume_db = SILENT_DB
	add_child(_music_player)
	for i in range(4):
		var voice := AudioStreamPlayer.new()
		voice.name = "MaterialVoice%d" % i
		voice.volume_db = SILENT_DB
		add_child(voice)
		_voices.append(voice)
	_built = true
	_fade_target.fill(0.0)
	_fade_target[STATE_NAMES.find(_state)] = 1.0
	if _enabled:
		_start_music()


func set_state(state_name: String) -> void:
	var index := STATE_NAMES.find(state_name)
	if index < 0:
		push_warning("NightSound: unknown music state '%s'." % state_name)
		return
	if state_name == _state:
		return
	_state = state_name
	_fade_from = _weights.duplicate()
	_fade_target.fill(0.0)
	_fade_target[index] = 1.0
	_fade_elapsed = 0.0
	# Let go a little sooner for the held object; let the return unfold slowly.
	_fade_duration = 1.8 if state_name == "hold" else 2.8 if state_name == "resolve" else 2.4


func play_cue(cue_name: String) -> void:
	if not _enabled or not _built or not CUES.has(cue_name):
		return
	var now := Time.get_ticks_msec()
	var cooldown_ms := int(float(COOLDOWNS.get(cue_name, 0.4)) * 1000.0)
	if _last_cue_ms.has(cue_name) and now - int(_last_cue_ms[cue_name]) < cooldown_ms:
		return
	# Never steal/cut an already sounding voice because of repeated input.
	for voice in _voices:
		if not voice.playing:
			_last_cue_ms[cue_name] = now
			voice.stream = CUES[cue_name] as AudioStream
			voice.volume_linear = _master_gain * db_to_linear(CUE_GAIN_DB)
			voice.play()
			return


func set_enabled(enabled: bool) -> void:
	_enabled = enabled
	if _built and _enabled and not _started:
		_start_music()


func _start_music() -> void:
	_music_player.play()
	_started = true


func _exit_tree() -> void:
	# Release native synchronized playbacks explicitly when this scene leaves.
	if is_instance_valid(_music_player):
		_music_player.stop()
		_music_player.stream = null
	if is_instance_valid(_synchronized):
		for i in range(_synchronized.stream_count):
			_synchronized.set_sync_stream(i, null)
	for voice in _voices:
		if is_instance_valid(voice):
			voice.stop()
			voice.stream = null
	_voices.clear()
	_synchronized = null


func _process(delta: float) -> void:
	if not _built:
		return
	# A short gain ramp also applies to active material voices when muted.
	_master_gain = move_toward(_master_gain, 1.0 if _enabled else 0.0, delta / 0.12)
	_music_player.volume_linear = _master_gain * db_to_linear(MUSIC_GAIN_DB)
	for voice in _voices:
		voice.volume_linear = _master_gain * db_to_linear(CUE_GAIN_DB)
		if not _enabled and _master_gain <= 0.0:
			voice.stop()
	if _fade_elapsed < _fade_duration:
		_fade_elapsed = minf(_fade_elapsed + delta, _fade_duration)
		var progress := _fade_elapsed / _fade_duration
		var shaped := progress * progress * (3.0 - 2.0 * progress)
		for i in range(MUSIC.size()):
			_weights[i] = lerpf(_fade_from[i], _fade_target[i], shaped)
			_synchronized.set_sync_stream_volume(i, _gain_db(_weights[i]))


func _gain_db(gain: float) -> float:
	# -80 dB is the silent floor; linear-amplitude interpolation avoids a
	# +3 dB hump when the phase-aligned variants share the same piano notes.
	return linear_to_db(gain) if gain > 0.0001 else SILENT_DB
