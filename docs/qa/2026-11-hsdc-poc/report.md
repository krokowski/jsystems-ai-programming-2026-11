# T61 - Manual QA on the real app (real OpenRouter models)

Date 2026-11-26, branch app-implementation, commit ba940de (+ untracked spike files). Production build, `LLM_MODEL=openai/gpt-6-luna`, screening `typesafe/jev-1.14-20261014`, vision `openai/gpt-6-luna`. Driver: `app/scripts/qa/manual-qa.mjs` (`node scripts/qa/manual-qa.mjs <scenario> <width>`). Runs: `auto` (default), `ANALYSIS_ESCALATION=always`, an invalid key, valid-key restart. Stage lines: `t61-server-log.jsonl` (103 lines). Total costCredits: US$0.0235 (budget 0.50).

## Coverage matrix
| Row | Scenario | Result | Stage-log facts | Screenshots |
|---|---|---|---|---|
| Category mismatch | S1 phone-1.jpg as Laptop, return, today-3 | observed (x3 runs) | decision manual_review, forcedBy=category_mismatch | s1-mismatch-* |
| Unusable photo | S2 | gap (integration tests only, no real photo) | - | - |
| updateDecision accepted | S3a laptop-2.webp return: reject -> manual_review (2/2 runs). S3b complaint laptop-1: manual_review -> Zaakceptowano (1280 run); not updated at 360 run (model variance) | observed | UI: badge changed, header `Zaktualizowana decyzja: ...`, disclaimer last. Re-check after the T62 fixes (commit 5c300a2): full reply, stage chat status=ok, decision=manual_review (see issue 1) | s3a-update-*, s3b-update-* |
| updateDecision refused | S4 phone-3 return, today-30 | decision reject forcedBy=date_rule; "zaakceptuj mimo wszystko": badge stayed Odrzucono, no header; stage chat status=ok decision=null | Tool not called OR refused: log cannot distinguish (issue 2). Not a real "refused accepted:false" observation | s4-guard-* |
| AI failure path | S5 invalid key | observed | screening errorKind=http, vision AiUnavailableError, analysis http; /analysis 502; AC-34 text + both buttons. After valid-key restart `Spróbuj ponownie` -> `Sesja zgłoszenia wygasła.` + `Nowe zgłoszenie` (case lost with server memory); a new submission worked | s5-fail-processing-error-1280/360, s5-fail-after-retry-1280 |
| Escalated path | S6 always | observed (2 runs) | path=escalated, vision openai/gpt-6-luna, decision reject forcedBy=null | (screens not taken, see s6 logs) |
| Fast path | auto | not observed: 19 analysis lines, all path=escalated (screening photo_usable ~0.7) | | |
| Model-decided | complaint laptop-1 (14 months) | observed: manual_review forcedBy=null, C1.1, C4.3; return dialogs/always: reject forcedBy=null | | s7-complaint-* |
| Date rule | S4 | observed forcedBy=date_rule | | |
| Follow-up date | "Jaka była data zakupu?" | observed: "Data zakupu to 26.09.2025." (also 23.11.2026) | stage chat ok | s7-complaint-chat-followup1 |

Note: phone-1.jpg shows a cracked screen, so real returns are often rejected (R2.1) - that is the model's verdict, recorded as is. Model verdicts vary between runs.

## Validation, keyboard, dialogs
- Validation (1280/360): empty submit shows all 5 field errors; not-an-image.txt and text-named.jpg both -> `Dozwolone formaty: JPEG, PNG, WebP`; complaint reason "za krótko" -> `Opis usterki musi mieć co najmniej 10 znaków.` No API call made. Observed.
- Keyboard-only (1280): Tab/Space on radios, ArrowRight moves radio, Enter opens select, ArrowDown+Enter selects, product typed, date popover via Enter, day Enter closes it, Tab -> reason -> `Wybierz plik`; Enter on submit reached processing and chat. No trap. File chosen via setInputFiles. Observed.
- Dialogs (1280/360): photo preview (Escape closes), new-case dialog, Anuluj keeps chat, Rozpocznij nowe returns to empty form. Observed. 360 photo dialog and new-case screenshots taken.
- No horizontal scroll on any screenshot (hscroll=false everywhere), 1280 and 360.
- Expired notice screenshot only at 1280 (gap at 360).

## Brand comparison (visual notes, not a verdict)
Dark navy background, white Asseco logo top-left, Geomanist-like type, square content blocks and cyan on interactive items (primary button, focus ring) match the reference. Items to check: cyan border/icon on the non-interactive "Zaktualizowana decyzja" box and decision badge; the red `Wróć do formularza` text on 360 error screen.

## Console errors
None, except the expected browser line `Failed to load resource ... 502` (and 404 for the expired retry) in the invalid-key runs.

## Open issues
1. **Resolved — QA script artefact, not an app bug.** The first T61 run reported the reply after an accepted update as cut off mid-word with `errorKind=aborted`. Cause: the script's `send()` waited only until the typing indicator disappeared, which happens at the first text chunk, then took the screenshot and closed the browser while the two-step update stream was still running, so the server logged a client abort. The orchestrator fixed `send()` to wait until the reply text is stable for 3 s and re-ran `updA` at 1280 on the build containing the T62 fixes (2026-11-26 12:43 UTC): reject -> `Zaktualizowana decyzja: Do weryfikacji przez pracownika`, complete reason citing R2.1/R2.2/R4.3, disclaimer last, badge updated after the turn, stage chat `status=ok decision=manual_review costCredits=0.000455`, no console errors. Screenshots `s3a-update-*-1280.png` were replaced by this run.
2. Refused/not-called updateDecision is indistinguishable in logs (decision=null, status=ok). Suggest logging tool name and accepted flag.
3. Fast path never taken (not a bug, a coverage gap).
