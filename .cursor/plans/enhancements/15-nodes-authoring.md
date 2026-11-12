# Nodes authoring (add/remove/type/triggers)

**Issue:** Nodes authoring (add/remove/type/triggers)  
**Wave:** 3 · **Effort:** L · **Status:** done (image nodes)

## Goal

Studio Nodes tab supports add/remove and triggers for WebAR-supported image nodes.

## Shipped

- Add image node (persists draft + pending asset slot)
- Remove non-locked nodes (`finished` / `raw` / `overlay` locked)
- Trigger select: `onDetect` | `tap`
- Per-node image upload into the node’s `assetId`
- Kind + support copy on Nodes tab

## Follow-up

Non-image types (video/audio/extra model) → [19](19-non-image-node-authoring.md) after runtime [18](18-video-audio-proximity-nodes.md).

## Acceptance

- [x] Artist can add an image node, set trigger, upload, publish, and see it in WebAR
