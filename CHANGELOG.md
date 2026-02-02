# BTime Changelog

This file contains summaries of major/relevant changes to the BTime project in reverse chronological order.

The current versioning convention tracks changes to BTime as a whole. Packages will maintain their own versions as necessary.

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
- updated virtual-cubing package with support for

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
