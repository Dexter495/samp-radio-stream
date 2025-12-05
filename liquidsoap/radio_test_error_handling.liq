#!/usr/bin/liquidsoap

music = playlist("/home/runner/work/samp-radio-stream/samp-radio-stream/uploads/test_error_handling")

radio = fallback(track_sensitive=false, [music, blank()])

output.icecast(
  %ffmpeg(format="mp3", %audio(codec="libmp3lame", b="128k")),
  host="localhost",
  port=8000,
  password="hackme",
  mount="test_error_handling",
  radio
)
