# Liquidsoap Integration - Implementation Summary

## Overview
This implementation integrates Liquidsoap to enable real-time audio streaming control for each user in the SA-MP Radio Streaming system. Users can now start and stop their own radio streams with actual audio playback.

## Changes Made

### 1. New Imports (app.py)
- Added `subprocess` for process management
- Added `signal` for signal handling (imported but available for future use)

### 2. Global Variables
```python
liquidsoap_processes = {}  # Dictionary to track active processes per user
LIQUIDSOAP_PATH            # Path to liquidsoap executable (cross-platform)
LIQUIDSOAP_SCRIPTS_PATH    # Directory for generated .liq scripts
```

### 3. New Functions

#### `generate_liquidsoap_config(usuario)`
Generates a Liquidsoap configuration file (.liq) for each user with:
- User's playlist folder as music source
- Fallback to blank audio if no songs available
- FFmpeg MP3 encoding at 128kbps
- Icecast output configuration with user-specific mount point
- Uses `config.ICECAST_PASSWORD` for security

#### `start_liquidsoap(usuario)`
Starts a Liquidsoap process for a user:
- Stops any existing process for the user
- Generates new .liq configuration
- Spawns Liquidsoap subprocess
- Cross-platform support (Windows uses CREATE_NO_WINDOW flag)
- Returns True on success, False on error
- Handles FileNotFoundError if Liquidsoap not installed

#### `stop_liquidsoap(usuario)`
Stops a user's Liquidsoap process:
- Gracefully terminates process with 5-second timeout
- Falls back to kill() if terminate fails
- Handles specific exceptions (TimeoutExpired, ProcessLookupError)
- Cleans up process dictionary
- Always returns True

### 4. Modified API Endpoints

#### `/api/<usuario>/play` (play_song)
- Now calls `start_liquidsoap(usuario)` before updating state
- Returns error if Liquidsoap fails to start
- Maintains existing functionality (state management, stream URL)

#### `/api/<usuario>/stop` (stop_song)
- Now calls `stop_liquidsoap(usuario)` before updating state
- Ensures process cleanup when stopping playback
- Maintains existing functionality (state reset)

## Configuration

### Cross-Platform Support
```python
# Windows
LIQUIDSOAP_PATH = "E:/liquidsoap-2.4.0-win64/liquidsoap.exe"
LIQUIDSOAP_SCRIPTS_PATH = "E:/liquidsoap-2.4.0-win64"

# Unix-like (Linux, macOS)
LIQUIDSOAP_PATH = "liquidsoap"  # Must be in PATH
LIQUIDSOAP_SCRIPTS_PATH = "{BASE_DIR}/liquidsoap"
```

### Generated Liquidsoap Script Structure
```liquidsoap
#!/usr/bin/liquidsoap

music = playlist("{user_folder}")
radio = fallback(track_sensitive=false, [music, blank()])

output.icecast(
  %ffmpeg(format="mp3", %audio(codec="libmp3lame", b="128k")),
  host="localhost",
  port=8000,
  password="{ICECAST_PASSWORD}",
  mount="{username}",
  radio
)
```

## User Flow

### Starting a Stream
1. User clicks "Play" on a song
2. Frontend sends POST to `/api/{user}/play`
3. Backend calls `start_liquidsoap(user)`
4. Liquidsoap config generated at `{SCRIPTS_PATH}/radio_{user}.liq`
5. Liquidsoap process spawned
6. Stream available at `http://localhost:8000/{user}`
7. State saved and stream URL returned

### Stopping a Stream
1. User clicks "Stop"
2. Frontend sends POST to `/api/{user}/stop`
3. Backend calls `stop_liquidsoap(user)`
4. Liquidsoap process terminated gracefully
5. Stream stops
6. State reset and success returned

## Security

### CodeQL Analysis
✅ **0 vulnerabilities detected**

### Security Measures
1. **No hardcoded secrets**: Uses `config.ICECAST_PASSWORD`
2. **Specific exception handling**: Catches TimeoutExpired, ProcessLookupError
3. **Process isolation**: Each user has separate process
4. **Secure filenames**: Uses `secure_filename()` for mount points and scripts
5. **Proper cleanup**: Always removes processes from dictionary

### .gitignore
Generated scripts ignored: `liquidsoap/radio_*.liq`

## Testing

All tests pass ✅:
- Import verification
- Global variable initialization
- Function existence and signatures
- Config file generation
- Error handling (missing Liquidsoap)
- Route integration
- Cross-platform path handling
- Security scan (CodeQL)

## Requirements

### System Dependencies
- **Liquidsoap**: Must be installed and accessible
  - Windows: Configure `LIQUIDSOAP_PATH` to executable
  - Linux/macOS: Install via package manager (apt, brew, etc.)
- **Icecast**: Must be running on port 8000
- **FFmpeg**: Required by Liquidsoap for MP3 encoding

### Python Dependencies
- Flask (existing)
- All existing dependencies maintained

## Technical Notes

### Process Management
- Each user can have max 1 active Liquidsoap process
- Processes automatically cleaned up on stop
- Graceful shutdown with 5-second timeout
- Force kill as fallback

### File Generation
- Scripts generated on-demand in `LIQUIDSOAP_SCRIPTS_PATH`
- Format: `radio_{username}.liq`
- Automatically ignored by git

### Cross-Platform Considerations
- Windows: Uses `CREATE_NO_WINDOW` flag (no console windows)
- Unix: Standard subprocess spawning
- Path handling with `replace("\\", "/")`

## Future Enhancements
1. Process health monitoring
2. Automatic restart on crash
3. Resource usage tracking
4. Multiple quality options
5. Dynamic bitrate adjustment

## Troubleshooting

### "Error al iniciar el streaming"
- Verify Liquidsoap is installed
- Check `LIQUIDSOAP_PATH` configuration
- Ensure Icecast is running

### Stream not appearing
- Verify Icecast connection (port 8000)
- Check Icecast password matches
- Review Liquidsoap logs

### Process not stopping
- Check process permissions
- Verify timeout settings
- Review system logs

---

**Implementation Date**: December 5, 2025  
**Status**: ✅ Complete and tested  
**Security**: ✅ 0 vulnerabilities  
**Cross-platform**: ✅ Windows, Linux, macOS
