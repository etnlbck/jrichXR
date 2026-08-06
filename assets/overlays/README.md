# Guide-mark overlay

Drop `guide-marks.png` here — a transparent PNG of the artist's orange/purple guide marks, generated from a sculpture photo via [aglitch.art](https://aglitch.art) (image → SVG), then exported/rasterized to PNG.

For the POC this is a single static overlay that fades in with the raw state. The full raw→finished vector morph is a Phase 2 item, out of scope here.

- Transparent background.
- Sized to sit as a plane in front of the model (tune the plane in `js/scene.js` and `config.placement`).
