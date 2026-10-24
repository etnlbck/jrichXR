export const EDITOR_TABS = [
  ['overview', 'Overview'],
  ['provenance', 'Provenance'],
  ['placement', 'Placement'],
  ['assets', 'Assets'],
  ['nodes', 'Nodes'],
  ['pins', 'Pins'],
] as const;

export type EditorTab = (typeof EDITOR_TABS)[number][0];

export function parseEditorTab(value: string | string[] | undefined): EditorTab {
  const raw = Array.isArray(value) ? value[0] : value;
  return EDITOR_TABS.some(([id]) => id === raw) ? (raw as EditorTab) : 'overview';
}
