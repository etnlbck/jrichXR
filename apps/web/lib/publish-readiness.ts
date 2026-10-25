import {
  assetWebPath,
  mediaImageNodes,
  type GalleryExperience,
} from '@jrichforms/experience';

export type ReadinessLevel = 'ok' | 'warn' | 'block';

export type ReadinessItem = {
  code: string;
  level: 'warn' | 'block';
  message: string;
};

export type PublishReadiness = {
  level: ReadinessLevel;
  items: ReadinessItem[];
};

/**
 * Studio + publish API readiness for a draft package.
 * block > warn > ok. Override in UI/API bypasses block for field tests.
 */
export function getPublishReadiness(
  experience: GalleryExperience
): PublishReadiness {
  const items: ReadinessItem[] = [];

  const finishedUrl = assetWebPath(experience, 'finished-glb');
  if (!experience.gallery.usePlaceholderCube && !finishedUrl) {
    items.push({
      code: 'missing_finished_glb',
      level: 'block',
      message: 'Finished GLB is missing — upload one or enable placeholder cube',
    });
  }

  if (experience.gallery.usePlaceholderCube) {
    items.push({
      code: 'placeholder_cube',
      level: 'warn',
      message: 'Placeholder cube is on',
    });
  }

  if (experience.assets['raw-glb']?.interim === true) {
    items.push({
      code: 'interim_raw',
      level: 'warn',
      message: 'Raw GLB is marked interim',
    });
  }

  if (experience.assets.narration?.interim === true) {
    items.push({
      code: 'interim_narration',
      level: 'warn',
      message: 'Narration is marked interim',
    });
  }

  for (const node of mediaImageNodes(experience)) {
    if (!assetWebPath(experience, node.assetId)) {
      items.push({
        code: `missing_image_${node.id}`,
        level: 'warn',
        message: `Image node “${node.id}” has no uploaded asset`,
      });
    }
  }

  for (const node of experience.nodes) {
    if (node.id === 'overlay' || node.id === 'finished' || node.id === 'raw') {
      continue;
    }
    if (node.type === 'video' || node.type === 'audio' || node.type === 'model') {
      if (!assetWebPath(experience, node.assetId)) {
        items.push({
          code: `missing_${node.type}_${node.id}`,
          level: 'warn',
          message: `${node.type} node “${node.id}” has no uploaded asset`,
        });
      }
    }
  }

  for (const pin of experience.gallery.pins ?? []) {
    if (pin.audioAssetId && !assetWebPath(experience, pin.audioAssetId)) {
      items.push({
        code: `missing_pin_audio_${pin.id}`,
        level: 'warn',
        message: `Pin “${pin.title || pin.id}” references missing audio`,
      });
    }
  }

  const level: ReadinessLevel = items.some((i) => i.level === 'block')
    ? 'block'
    : items.some((i) => i.level === 'warn')
      ? 'warn'
      : 'ok';

  return { level, items };
}
