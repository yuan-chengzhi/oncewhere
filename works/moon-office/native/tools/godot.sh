#!/usr/bin/env bash
set -euo pipefail
oncewhere_data_home="${XDG_DATA_HOME:-$HOME/.local/share}"
oncewhere_godot="$oncewhere_data_home/oncewhere-tools/godot/4.7.2-stable/Godot_v4.7.2-stable_linux.x86_64"
if [[ ! -x "$oncewhere_godot" ]]; then
  # QA runs may point XDG_DATA_HOME at an empty per-run user directory. Keep
  # the pinned editor discoverable without mixing its cache into that folder.
  oncewhere_fallback_home="$HOME/.local/share"
  oncewhere_fallback_godot="$oncewhere_fallback_home/oncewhere-tools/godot/4.7.2-stable/Godot_v4.7.2-stable_linux.x86_64"
  if [[ -x "$oncewhere_fallback_godot" ]]; then
    oncewhere_godot="$oncewhere_fallback_godot"
  fi
fi
if [[ ! -x "$oncewhere_godot" ]]; then
  echo "Godot is missing. Run: python3 $(dirname "$0")/bootstrap.py" >&2
  exit 1
fi
exec "$oncewhere_godot" "$@"
