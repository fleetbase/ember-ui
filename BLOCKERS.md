# BLOCKERS

Things that stopped work on a file, with enough detail to pick up later. Work moved on to the next
file rather than waiting. Remove an entry when it is cleared.

Format:

```
## <file or area> — one-line summary
**Hit:** when, and what was being attempted
**Symptom:** the exact error or observation
**Tried:** what was attempted, so nobody repeats it
**Next:** the most promising thing to try
```

---

## Test runs — Chrome intermittently fails to start under machine contention

**Hit:** 2026-08-25, running the full suite while another session was also running `ember test`.
**Symptom:** the suite reports one synthetic failure rather than a real one:

    not ok 1 Chrome - error
      Error: Browser failed to connect within 120s. testem.js not loaded?
      ... Network service crashed or was terminated, restarting service.

An `EADDRINUSE` collision on port 7357 presents similarly, as
`# tests 1 / # pass 0 / # fail 1`. Both read like a broken suite at a glance and are not.

**Tried:** moving every run to `--port=7399`, which fixed the port collisions but not this. The
Chrome failure is resource contention — two headless Chromes plus two ember-cli builds on one
machine.
**Next:** re-run; it succeeds on a quiet machine. If it becomes frequent, raise
`browser_start_timeout` (already 120) or serialise runs between sessions. Do NOT `pkill -f "ember
test"` to clear it — other sessions and dev servers share this machine, and a blanket kill has
already taken out someone else's run once.

