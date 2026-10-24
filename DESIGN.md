# Deskkeep Design System

## Direction

Deskkeep uses a **compact local utility** derived from the KeepR reference: a crisp module rail, information-dense work area, restrained grayscale surfaces, muted blue actions, and monospace typography. It remains an original Deskkeep implementation while matching the reference application's practical desktop rhythm.

## Durable rules

- Restrained palette: neutral white/gray light mode, charcoal dark mode, muted steel-blue primary, amber attention, red destructive, and green completed.
- All interface typography uses the compact system monospace stack from the reference: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, and fallbacks.
- Navigation is a fixed narrow module rail. The current module uses a quiet filled state; groups are labelled Modules and Tools.
- Dense records use hairline-divided rows and compact panels. Shadows are extremely subtle and never compete with the information.
- Radius is 10px for substantial surfaces and 6–8px for controls; pills remain limited to status and compact switches.
- Motion is one restrained module-change transition plus direct control feedback; reduced motion removes it.
- Light and dark modes are equal product surfaces, persist locally, and can be changed from either the profile rail or Appearance settings.
- Every module has authored empty, loading, validation, locked, and error states.

## Core tokens

```text
light-paper      #f8f9fa
light-raised     #ffffff
light-ink        #20242a
dark-paper       #17191d
dark-raised      #202329
dark-ink         #e9ebed
primary          #477d98
primary-dark     #72a7bf
attention        #b4852d
danger           #c55353
success          #5f806c
```

## Signature behavior

The rail remains visually fixed while module content changes with a short clipped transition. Theme changes are immediate, persistent, and preserve the same hierarchy rather than mechanically inverting colors.
