# Device Session Management - Frontend Implementation

## Overview

Implemented a complete device session management system for the MomiChan frontend that integrates with the backend API. Users can now view, manage, and control all devices that have access to their account.

## Features Implemented

### 1. Device Fingerprinting

- **Library**: FingerprintJS v5.0.1
- **Location**: `src/utils/fingerprint.ts`
- Generates unique device fingerprints for identification
- Includes fallback mechanism for reliability
- Initialized on app startup (non-blocking)

### 2. Enhanced Device Information

- **Location**: `src/utils/device.ts`
- Collects comprehensive device data:
  - Device fingerprint (unique ID)
  - Browser name and version
  - Operating system and version
  - Device type (desktop/mobile/tablet)
  - Screen resolution
  - Timezone
  - Language preference

### 3. Session Management API

- **Location**: `src/api/sessionService.ts`
- **Endpoints**:
  - `GET /sessions/` - List all active sessions
  - `GET /sessions/current` - Get current session info
  - `POST /sessions/revoke` - Sign out specific device
  - `POST /sessions/revoke-all` - Sign out all other devices
  - `POST /sessions/trust` - Trust/untrust device
  - `PUT /sessions/device-name` - Update device name

### 4. Device Management UI

- **Location**: `src/components/profile/DeviceManagement.vue`
- **Features**:
  - View all active sessions with details
  - Current device highlighted
  - Device icons (desktop/mobile/tablet)
  - Location information (IP, city, country)
  - Last active timestamp
  - IP change warnings (if > 5 changes)
  - Trust/untrust devices
  - Edit device names
  - Sign out individual devices
  - Sign out all other devices
  - Responsive design with mobile support

### 5. Profile Integration

- **Location**: `src/views/ProfilePage.vue`
- Added "Devices" tab to user profile
- Accessible alongside Favorites, Comments, Likes, History, and Notifications

### 6. Authentication Updates

- **Location**: `src/stores/auth.ts`
- Login and registration now send full device info
- Device fingerprint included in all auth requests

### 7. Internationalization

- **Locations**:
  - `src/i18n/locales/en.json`
  - `src/i18n/locales/zh-CN.json`
  - `src/i18n/locales/ja.json`
- Complete translations for:
  - Device management UI
  - Success/error messages
  - Confirmation dialogs
  - Time formatting

## File Structure

```
src/
├── api/
│   ├── sessionService.ts          # Session API calls
│   ├── authService.ts              # Updated with device_info
│   └── index.ts                    # Export session service
├── components/
│   └── profile/
│       └── DeviceManagement.vue    # Device management UI
├── stores/
│   └── auth.ts                     # Updated login/register
├── utils/
│   ├── fingerprint.ts              # Device fingerprinting
│   └── device.ts                   # Device info collection
├── views/
│   └── ProfilePage.vue             # Added devices tab
├── i18n/
│   └── locales/
│       ├── en.json                 # English translations
│       ├── zh-CN.json              # Chinese translations
│       └── ja.json                 # Japanese translations
└── main.ts                         # Initialize fingerprint
```

## Usage

### For Users

1. **View Active Devices**:
   - Navigate to Profile → Devices tab
   - See all devices with access to your account

2. **Manage Devices**:
   - Edit device names for easy identification
   - Trust frequently used devices
   - Sign out suspicious or unused devices
   - Sign out all other devices with one click

3. **Security Monitoring**:
   - Check last active time for each device
   - View IP addresses and locations
   - Get warnings for frequent IP changes

### For Developers

1. **Device Info Collection**:

```typescript
import { getFullDeviceInfo } from '@/utils/device'

const deviceInfo = await getFullDeviceInfo()
// Returns: { device_fingerprint, device_name, device_type, device_os, ... }
```

2. **Session Management**:

```typescript
import { sessionService } from '@/api'

// Get all sessions
const { sessions } = await sessionService.getSessions()

// Revoke a session
await sessionService.revokeSession(sessionId)

// Trust a device
await sessionService.trustSession(sessionId, true)
```

## Security Features

1. **Device Type Limits**: Backend enforces one active session per device type (desktop/mobile/tablet)
2. **IP Change Detection**: Tracks and warns about frequent IP changes
3. **Trusted Devices**: Users can mark devices as trusted for reduced security checks
4. **Session Revocation**: Immediate logout from compromised devices
5. **Device Fingerprinting**: Unique identification even after browser data clearing

## API Integration

The frontend expects the backend API to follow this structure:

### Session Response

```typescript
interface Session {
  id: string
  device_name: string
  device_type: 'desktop' | 'mobile' | 'tablet'
  device_os: string
  device_browser: string
  ip_address: string
  last_used_at: string
  created_at: string
  is_current: boolean
  is_trusted: boolean
  country?: string
  city?: string
  ip_change_count?: number
}
```

### Login/Register Request

```typescript
interface LoginRequest {
  username: string
  password: string
  device_info?: {
    device_fingerprint: string
    device_name?: string
    device_type: string
    device_os: string
    device_browser: string
    screen_resolution: string
    timezone: string
    language: string
  }
}
```

## Testing

All code passes:

- ✅ TypeScript type checking
- ✅ ESLint validation
- ✅ Build compilation

## Browser Compatibility

- Modern browsers with ES6+ support
- FingerprintJS works on all major browsers
- Fallback fingerprinting for older browsers
- Responsive design for mobile devices

## Performance

- Device fingerprint initialized asynchronously (non-blocking)
- Lazy-loaded device management component
- Efficient session list rendering
- Optimized API calls with proper error handling

## Future Enhancements

Potential improvements:

1. Push notifications for new device logins
2. Device activity timeline
3. Geolocation map view
4. Two-factor authentication integration
5. Session duration limits
6. Automatic suspicious activity detection
