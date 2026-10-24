# Deskkeep: Logo and Animation Prompts

Use these prompts with an image generator, a video generator, or a designer. The brand values below come from `DESIGN.md` and the app's theme, so every output stays consistent with the product.

## Brand values to include

- **Name:** Deskkeep
- **Tagline:** Your private workspace, kept local.
- **Idea:** a private desk where everything you keep stays on your own computer. The mark combines a "D" for Desk with a keyhole for private storage.
- **Mood:** calm, quiet, trustworthy, desktop-native. Not playful, not corporate, not gamified.
- **Colors:**
  - Dark surface: `#17191d`
  - Steel blue (primary): `#477d98`
  - Light steel blue: `#72a7bf`
  - Light paper: `#f8f9fa`
  - Ink: `#20242a`
  - Muted gray: `#6b7480`
- **Type:** monospace, bold for the name (Consolas, Menlo, or SFMono style).
- **Shape language:** rounded corners (about 22% radius on the tile), simple flat shapes, no gradients, no shadows.

## Logo prompt (image generator or designer)

> Design a minimal app logo for "Deskkeep", a private desktop workspace that keeps notes, passwords, tasks, and money records on the user's own computer. The mark is a bold, solid letter "D" in steel blue (#477d98) on a rounded dark square tile (#17191d, about 22% corner radius). Cut a keyhole into the bowl of the "D" in the tile's dark color, so the keyhole reads as a vault inside the desk. Place a thin light steel-blue line (#72a7bf) beneath the "D" as the desk surface. Flat vector style, no gradients, no shadows, no 3D, no text in the icon. Keep it readable at 16 pixels. Provide a horizontal version with the wordmark "Deskkeep" in bold monospace (#20242a) to the right of the icon, and the tagline "Your private workspace, kept local." in smaller muted gray (#6b7480) underneath. Background: light paper (#f8f9fa) for the horizontal version, transparent for the icon.

Negative prompt: no lock padlock icon, no shield, no cloud, no gradients, no glossy effects, no 3D, no extra letters, no photorealism.

## Animation prompt (video generator)

> A six-second, 16:9 motion logo intro for "Deskkeep". Dark background (#17191d). Sequence:
> 1. 0.0 to 0.5 seconds: the screen is empty dark. A steel-blue (#477d98) rounded tile fades in at the center.
> 2. 0.5 to 1.4 seconds: a bold letter "D" in steel blue draws in from the left edge, growing to the right with a smooth ease-out.
> 3. 1.4 to 1.9 seconds: a keyhole in the dark color pops into the bowl of the "D" with a small overshoot, like a key turning.
> 4. 1.8 to 2.5 seconds: a light steel-blue line (#72a7bf) extends beneath the "D" from the center outward, as the desk surface.
> 5. 2.5 to 3.6 seconds: the wordmark "Deskkeep" types out letter by letter in bold monospace (#e9ebed), with the icon held still.
> 6. 3.9 to 4.7 seconds: the tagline "Your private workspace, kept local." fades in below the name in muted gray (#9aa3ad).
> 7. 4.7 to 5.5 seconds: hold the finished logo.
> 8. 5.5 to 6.0 seconds: fade to dark.
>
> Style: flat vector, clean geometry, no camera movement, no particles, no lens flare, no music required. Motion should feel calm and precise, with ease-out curves and no bounce except the keyhole's single small overshoot. Export 1920x1080, 30 frames per second, H.264 MP4, with a transparent or dark background.

## Alternative short version (for social posts)

> A 3-second vertical (9:16) loop: a steel-blue "D" with a keyhole draws itself on a dark background, then the word "Deskkeep" types out in bold monospace, ending on the tagline "Your private workspace, kept local." Flat vector style, ease-out motion, no music.

## Files in this folder

- `deskkeep-icon.svg`: the icon alone, scalable
- `deskkeep-icon-512.png`: the icon at 512 pixels
- `deskkeep-logo.svg`: the horizontal logo with wordmark and tagline
- `deskkeep-logo.png`: the horizontal logo as a picture
- `deskkeep-intro.html`: the animated intro, editable in any browser
- `deskkeep-intro.mp4`: the rendered six-second intro, 1280x720
- `deskkeep-final-frame.png`: the finished frame at the end of the intro
