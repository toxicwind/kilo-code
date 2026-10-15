# kilo-code — full fork

This is a full fork of [Kilo-Org/kilo-code](https://github.com/Kilo-Org/kilo-code) maintained
under the [toxicwind/kilo-code](https://github.com/toxicwind/kilo-code) mirror for the
awrawr-pc stack.

## Provenance

- **Pinned upstream SHA**: `a72ad30628`
- **Forked on**: 2026-10-15
- **Licence**: upstream (MIT for kilo-code, see upstream LICENSE)

## Layout

This directory contains the full upstream source tree. The toxicwind mirror is
pushed in lockstep with the pinned SHA — bump via the `ranch/FORKS.md`
bump procedure.

## Local use

```
cd ranch/kilo-code
git remote -v     # origin = toxicwind/kilo-code
git fetch upstream && git merge upstream/main
git push origin main
```
