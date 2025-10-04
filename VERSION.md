# Versioning System

ClubMotion follows semantic versioning: **x.y.z**

## Version Format

- **x** - Major version (breaking changes, major features)
- **y** - Minor version (new features, enhancements)
- **z** - Build version (patches, bug fixes)

## Commands

- **"increase version"** - Increment build version (z): `0.5.0` → `0.5.1`
- **"increase minor version"** - Increment minor version (y), reset build to 0: `0.5.0` → `0.6.0`
- **"increase major version"** - Increment major version (x), reset minor and build to 0: `0.5.0` → `1.0.0`

## Current Version

**0.6.6**

## Version Files

The version number is stored in two locations:

1. **version.json** - Source of truth, read by the application at runtime
2. **VERSION.md** - Documentation file (this file) for reference

When updating the version, you must update:
- `version.json` - Update the version field
- `VERSION.md` - Update the "Current Version" section
- `CHANGELOG.md` - Add new entry with changes
