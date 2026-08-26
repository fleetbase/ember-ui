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

**Do not assume every browser timeout is this.** A `Browser timeout exceeded: 120s` that names a
*specific test* is a different thing wearing the same clothes: the page navigated away and testem
lost the browser. That is what kept CI red on this branch for its whole life, and it was read as
contention for longer than it should have been. Tell them apart by the message — "Browser failed to
connect within 120s" before any test ran is contention; "Error while executing test: <name>" is the
test. Then check whether that test clicks a real `<LinkTo>` or anything else with an `href`.


---

## Nothing is currently blocking

The campaign reached a passing gate. The entry above stays because the Chrome start-up failure is a
property of this machine under contention, not of the suite — it will happen again, and the point of
the entry is that it reads like a broken suite and is not.
