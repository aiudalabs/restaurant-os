// BFF base URL.
// Android emulator reaches the host machine via the special alias 10.0.2.2.
// iOS simulator and physical devices on the same network use localhost or the host IP.
//
// Switch the active line when targeting a different environment:
//   Android emulator : http://10.0.2.2:8000
//   iOS simulator / host : http://localhost:8000
const kBffUrl = 'http://10.0.2.2:8000';
