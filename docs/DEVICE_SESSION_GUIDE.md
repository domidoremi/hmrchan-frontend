# Device Session Management - User Guide

## Overview

The device session management system allows users to monitor and control all devices that have access to their MomiChan account. This enhances security by providing visibility into active sessions and the ability to revoke access from suspicious or unused devices.

## Accessing Device Management

1. Log in to your MomiChan account
2. Click on your profile icon in the navigation bar
3. Select "Profile" from the dropdown menu
4. Click on the "Devices" tab

## Features

### View Active Devices

The device list shows all currently active sessions with the following information:

- **Device Name**: Browser and operating system (e.g., "Chrome on Windows")
- **Device Type**: Desktop, mobile, or tablet icon
- **Browser & OS**: Detailed version information
- **IP Address**: Current IP address
- **Location**: City and country (if available)
- **Last Active**: Time since last activity
- **Current Device**: Highlighted badge for your current session
- **Trusted Status**: Green badge for trusted devices

### Edit Device Names

1. Click the edit icon (pencil) next to any device name
2. Enter a custom name (e.g., "My Work Laptop", "iPhone 13")
3. Press Enter or click the checkmark to save
4. Press Escape or click the X to cancel

### Trust Devices

Trusted devices may receive reduced security checks:

1. Click the "Trust Device" button on any device
2. The device will be marked with a green "Trusted" badge
3. Click "Untrust Device" to remove trust status

**Note**: You cannot trust or untrust your current device from this interface.

### Sign Out Devices

#### Sign Out Single Device

1. Locate the device you want to sign out
2. Click the "Sign Out" button (trash icon)
3. Confirm the action in the dialog
4. The device will be immediately logged out

#### Sign Out All Other Devices

1. Click the "Sign Out All Other Devices" button at the top
2. Confirm the action in the dialog
3. All devices except your current one will be logged out

**Use this feature if**:

- You suspect unauthorized access
- You've lost a device
- You want to ensure only your current device has access

### Security Warnings

#### IP Change Warning

If a device's IP address has changed more than 5 times, you'll see a warning:

⚠️ IP address changed X times

**This may indicate**:

- Mobile device switching between networks
- VPN usage
- Potential security issue

**Recommended action**: Review the device and sign it out if suspicious.

## Security Best Practices

1. **Regular Review**: Check your active devices weekly
2. **Remove Unused Devices**: Sign out devices you no longer use
3. **Trust Carefully**: Only trust devices you personally control
4. **Monitor Locations**: Verify IP addresses and locations match your usage
5. **Act on Warnings**: Investigate devices with IP change warnings
6. **Use Strong Passwords**: Combined with device management for better security

## Device Type Limits

The system enforces one active session per device type:

- **Desktop**: One active desktop browser session
- **Mobile**: One active mobile browser session
- **Tablet**: One active tablet browser session

When you log in on a new device of the same type, the previous session will be automatically signed out.

## Troubleshooting

### Device Not Showing

**Problem**: A device you're using isn't in the list

**Solutions**:

- Refresh the page
- Ensure you're logged in
- Check if you were automatically signed out due to device type limits

### Can't Sign Out Device

**Problem**: Sign out button doesn't work

**Solutions**:

- Check your internet connection
- Refresh the page and try again
- Ensure you're not trying to sign out your current device

### Wrong Location Shown

**Problem**: IP location doesn't match your actual location

**Explanation**: IP geolocation is approximate and may show:

- Your ISP's location
- VPN server location
- Nearby city instead of exact location

This is normal and doesn't indicate a security issue if the general area is correct.

### Frequent IP Changes

**Problem**: Device shows many IP changes

**Common causes**:

- Mobile device switching between WiFi and cellular
- Dynamic IP from ISP
- VPN usage
- Traveling with device

**Action**: If you recognize the device and usage pattern, this is normal. Otherwise, sign out the device.

## Privacy & Data

### What Information is Collected

- Device fingerprint (unique identifier)
- Browser name and version
- Operating system and version
- Screen resolution
- Timezone
- Language preference
- IP address
- Login timestamp
- Last activity timestamp

### How It's Used

- Identify and track your sessions
- Detect suspicious activity
- Provide device management features
- Enhance account security

### Data Retention

- Active sessions are stored while logged in
- Signed out sessions are removed from the active list
- Historical session data may be retained for security audits

## Mobile Experience

The device management interface is fully responsive:

- **Tablet**: Full desktop experience
- **Mobile**: Optimized layout with:
  - Stacked device cards
  - Touch-friendly buttons
  - Simplified information display
  - Horizontal scrolling for tabs

## Keyboard Shortcuts

When editing device names:

- **Enter**: Save changes
- **Escape**: Cancel editing

## API Rate Limits

To prevent abuse, the following rate limits apply:

- Session list: 60 requests per minute
- Sign out device: 30 requests per minute
- Sign out all: 10 requests per minute
- Update device name: 30 requests per minute

If you exceed these limits, wait a minute before trying again.

## Support

If you encounter issues:

1. Check this guide for solutions
2. Refresh the page and try again
3. Clear browser cache and cookies
4. Contact support with:
   - Description of the issue
   - Browser and OS information
   - Screenshots (if applicable)

## Future Features

Planned enhancements:

- Email notifications for new device logins
- Device activity timeline
- Geolocation map view
- Two-factor authentication integration
- Automatic suspicious activity detection
