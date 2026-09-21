extends Node2D
## Small foreground prop drawn above the puppet layers so the handoff remains
## readable even when the close-up brooch is covering the counter.

var phase := 0.0
var glow_strength := 1.0

func _process(delta: float) -> void:
	phase += delta
	queue_redraw()

func _draw() -> void:
	var glow := (18.0 + sin(phase * 2.2) * 2.0) * glow_strength
	draw_circle(Vector2.ZERO, glow, Color(1.0, 0.78, 0.38, 0.09))
	draw_circle(Vector2.ZERO, 10.0, Color("e7b96b"))
	draw_circle(Vector2.ZERO, 6.0, Color("fff0bd"))
	draw_line(Vector2(-10, -12), Vector2(10, -12), Color("6a5234"), 2)
	draw_line(Vector2(-10, -12), Vector2(-7, 12), Color("6a5234"), 2)
	draw_line(Vector2(10, -12), Vector2(7, 12), Color("6a5234"), 2)
	draw_line(Vector2(-7, 12), Vector2(7, 12), Color("6a5234"), 2)
