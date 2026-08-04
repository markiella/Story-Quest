# Story Narration Audio Files

Place pre-generated MP3 narration files here with the naming pattern:

  {storyId}.mp3

Example:
  fable-crow-and-pitcher.mp3
  myth-prometheus.mp3
  realistic-fiction-001.mp3

AudioService automatically detects and prefers these files over SpeechSynthesis.
No code changes are required when adding files here.

Story IDs can be found in src/data/stories/*.ts — each story object has an `id` field.
