# Claude Code Instructions for ClubMotion

## Project Overview
ClubMotion is a club member management system built with Laravel 9.x backend and React frontend using Inertia.js. It features role-based access control for managing club members and payments.

## Versioning System

ClubMotion follows semantic versioning: **x.y.z**

### Version Format
- **x** - Major version (breaking changes, major features)
- **y** - Minor version (new features, enhancements)
- **z** - Build version (patches, bug fixes)

### User Commands
When the user says:

- **"increase version"** → Increment build version (z): `0.5.0` → `0.5.1`
  - For patches, bug fixes, small improvements
  - Reset: N/A

- **"increase minor version"** → Increment minor version (y), reset build to 0: `0.5.0` → `0.6.0`
  - For new features, enhancements
  - Reset: z to 0

- **"increase major version"** → Increment major version (x), reset minor and build to 0: `0.5.0` → `1.0.0`
  - For breaking changes, major features
  - Reset: y and z to 0

### Process for Version Changes

1. Update the version number in **VERSION.md** (Current Version section)
2. Add new entry to **CHANGELOG.md** with:
   - Version number and date
   - Summary of changes under appropriate categories (Added, Changed, Fixed, etc.)
3. Commit with message: `Release vX.Y.Z` or `Bump version to vX.Y.Z`
4. Push to repository

## Current Version
**0.5.0** (as of 2025-01-04)

See VERSION.md and CHANGELOG.md for detailed versioning instructions and change history.

## Deployment
- Project deploys via Git auto-pull on shared hosting (no SSH access)
- Always run `npm run build` before committing
- Committed files include `/public/build` artifacts

## Tech Stack
- **Backend**: Laravel 9.x with Sanctum for authentication
- **Frontend**: React 18 + Inertia.js + Tailwind CSS v3
- **Build Tool**: Vite
- **Database**: MySQL (via shared hosting)

## Role System
- **admin** (role_id=1): Full system access
- **superuser** (role_id=2): Club management access
- **user** (role_id=3): Personal profile and payments only
