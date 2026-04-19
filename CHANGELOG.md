# BTime Changelog

This file contains summaries of major/relevant changes to the BTime project in reverse chronological order.

The current versioning convention tracks changes to BTime as a whole. Packages will maintain their own versions as necessary.

## 0.6.4 - 2026-04-18

Changed:

- Migrated off of Mongodb onto PostgreSQL w/ Drizzle ORM

## 0.6.3 - 2026-03-01

Added:

- Add support for 2x2 through 5x5 in Virtual Cube

## 0.6.2 - 2026-02-23

Added:

- Session (live, during match) stats are finally shown on the main room panel!
  - Two stats offered: overall mean and current ao5
  - Not doing a solve counts as a DNF. This may be changed in the future.

Bug Fixes:

- fixed a missing dependency lint issue in bluetooth-cube-timer

## 0.6.1 - 2026-02-22

Added:

- GAN bluetooth cube support (v2-v4 protocols)
  - only v2 protocol was tested. v3 and v4 are completely untested
  - orientation data is not implemented.

Bug Fixes:

- add default orientation (identity) to bluetooth cube parent class
- add missing startTimer() call to no inspection bluetooth-cube-timer component

## 0.6.0 - 2026-02-20

Added:

- two new timer types to use in rooms: one for a virtual cube, one for a bluetooth cube
- new global context for key listeners to hook into to prevent creating many window event listeners. Instead, two (keyup, keydown) event listeners can handle all key listening events.
- new global keybind store for (mainly) virtual cube controls. A potential next step is to provide an interface to define custom keybinds.
- new hook for inspection timing and state updates/control

Changed:

- refactors KeyListener component to use new keybind context + hook
- refactors the animation queue into an external store with React integration through useSyncExternalStore

Bug Fixes:

- refactor room update server message to exclude password completely
- fixes text placement relative to the arrow icons in room panel carousel
- prevent various buttons in room header and sidebar from triggering upon keypress after focusing

## 0.5.1 - 2026-02-05

Added:

- new reusable `useTimer()` hook
- new `onSolved()` listener in `useBluetoothCube()` hook
- new `clearAnimationQueue, clearCurrentElem` callbacks in `useAnimationQueue()` hook

Changed:

- use `useTimer()` in stopwatch timer component, /virtual and /bluetooth routes
- prevent double-click on submit result button
- disable viewer controls on /bluetooth cube viewer
- fix state event handling in bluetooth-cubing

## 0.5.0 - 2026-02-02

Added:

- new Bluetooth cube API in bluetooth-cubing to support bluetooth cube development and integration
  - first bluetooth cube implementation for Moyu32 cube protocol
- new hook for bluetooth cubes in bluetooth-cubing-react to make lifecycle management easier
- new bluetooth cube demo in /bluetooth route
- added support for initial state in virtual cube
- added scripts folder for convenient dev-time scripting

Changed:

- refactor bluetooth-cubing package for consolidated types and utils

## 0.4.0 - 2026-01-20

Added:

- new Virtual cube library to support rendering 3D cubes (only 3x3 for now)
  - supports live move animation
- new /virtual route to demonstrate the virtual cube

### 0.4.1 - 2026-01-20

Changed:

- hotfix typo made when refactoring virtual cube library that caused incorrect animation direction

### 0.4.2 = 2026-01-21

Changed:

- update useAnimationQueue to use refs instead of state for tracking moves to fix a race condition, clean up hook return values.

## 0.3.0 - 2026-01-10

Changed:

- set up proper monorepo with tooling for entire project
- switch package management from `npm` to `pnpm`
- switch off of Next.js to Vite + Tanstack Router
- remove most preprocessing (before enqueueing) of room events

## 0.2.0 - 2026-01-01

Added:

- created a sequential queue system for handling room events (redis)

### 0.2.1 - 2026-01-02

Added:

- new DEV log level

Changed:

- fixed room disconnect event

## 0.1.0

Added:

- BTime

Key features:

- ability to create and join rooms for live, n-way head-to-head cubing
- compatibility with multiple timer types: keyboard (space only), typing, GAN timer
- custom racing formats
  - custom match formats (done over sets): Best Of, First To
  - custom set formats (done over solves): Best Of, First To, Average Of, Mean Of, Fastest Of
- the ability to race in teams
  - custom team modes: All, One (how many on the team compete per solve)
  - custom aggregation functions for All mode: Sum, Mean, Fastest, Median
