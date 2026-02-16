# Rest Timer Duration Setting

## Overview

Add duration setting (minutes and seconds) for the rest timer. Only visible when rest timer toggle is enabled.

## Design

### UI Layout

```
┌─────────────────────────────────┐
│ 組間計時              [開關: ON] │
├─────────────────────────────────┤
│   計時時間   [1] 分  [30] 秒     │ ← Conditionally shown
└─────────────────────────────────┘
```

- When toggle is OFF: duration row hidden
- When toggle is ON: duration row appears below with indentation
- Same row layout: label on left, two number inputs with unit labels on right

### Data Structure

Add to `settingsStore`:

- `restTimerMinutes: number` (default: 1, range: 0-9)
- `restTimerSeconds: number` (default: 30, range: 0-59)
- `setRestTimerMinutes(minutes: number): void`
- `setRestTimerSeconds(seconds: number): void`

### Input Validation

- Minutes: 0-9 (single digit)
- Seconds: 0-59
- Use numeric keyboard (`keyboardType="numeric"`)
- Clamp values on blur if out of range

## Implementation

1. **Update settingsStore** - Add minutes/seconds state and setters
2. **Update settings page** - Add conditional duration input row
3. **Validation** - Clamp inputs to valid ranges
