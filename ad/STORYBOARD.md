# Deskkeep Ad: Storyboard

60 seconds, 1920×1080, 30 fps, with an original upbeat theme (124 BPM, generated in `scripts/make-music.mjs`).

Structure: problem → reveal → features with real screens → privacy promise → call to action. Every message is also shown as on-screen text, so the ad works with the sound off.

| Time | Scene | On screen | Message |
| --- | --- | --- | --- |
| 0:00–0:05 | Hook | App names float around a headline | "Your life is spread across too many apps." |
| 0:05–0:11 | Problem | Three questions, one at a time | "Where did I save that login?" · "Which renewal is due Friday?" · "Did I log this month's income?" |
| 0:11–0:15 | Reveal | Logo mark draws, name types out, tagline fades in | "Deskkeep. Your private workspace, kept local." |
| 0:15–0:20 | Dashboard | Real dashboard, slow zoom, two callouts | "Everything you manage, in one place." |
| 0:20–0:26 | Vault | Cursor clicks copy on a login, callout "Clears in 30s" | "Copy a login. It clears itself." |
| 0:26–0:31 | Notes | Real notes screen, "Import .md file" callout | "Write in Markdown. Import your .md files." |
| 0:31–0:37 | Tasks | A card is dragged from To Do to In Progress | "Drag work across the board." |
| 0:37–0:42 | Calendar | Today highlighted, "+N more" callout | "Every day stays tidy. Extra items fold into +N more." |
| 0:42–0:48 | Money | Income screen, then subscriptions with real brand logos | "Track every payment that comes in." · "Never miss a renewal again." |
| 0:48–0:53 | Features | Eight cards float in | Search, generator, Markdown, board, calendar views, world clocks, backup, auto-lock |
| 0:53–0:56.5 | Privacy | Large type | "100% local." · "No cloud. No account. Works offline." |
| 0:56.5–1:00 | Call to action | Logo lockup, tagline, four chips | "Your private workspace, kept local." Windows-first · Works offline · Encrypted · No account |

## Production notes

- **Screens are real.** Every app screen is a capture of the running app with demo data (`scripts/capture.cjs`), so the ad never shows an invented interface.
- **Motion vocabulary.** Springs for entrances, slow drifting light behind every scene, cursor paths with eased curves and click ripples, and a single moving card for the drag.
- **Music is original.** It is synthesized, not licensed. Replace `public/audio/deskkeep-theme.wav` with any track you have rights to, and keep the same file name.

## Rendering

```bash
npm install
npm run music     # regenerate the theme track (optional)
npm run render    # writes out/deskkeep-ad.mp4
```

Open `npm run studio` to preview and scrub the timeline first.
