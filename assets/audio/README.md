# Narration

Drop `narration.mp3` here — one recorded clip (~30–60s) of the artist explaining what he saw in the stone before the first cut.

## iOS audio note

Autoplay is gesture-gated on iOS. The scaffold handles this by:
1. Unlocking the audio element inside the "Begin" tap (plays muted, then resets).
2. Actually playing on the **morph tap** (another user gesture).

Keep the file small (mono, ~96kbps is plenty for voice) so it doesn't compete with the model download on cellular.
