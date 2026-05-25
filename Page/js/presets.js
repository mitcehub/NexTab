import { cfgSet } from './store.js';

export var STYLE_OPTIONS = {
  clock: ['classic', 'glow', 'outline', 'shadow'],
  search: ['pill', 'glass', 'border', 'minimal'],
  site: ['round', 'card', 'outline', 'minimal']
};

export function applyPreset(group, name) {
  var key = group + '_style';
  var options = STYLE_OPTIONS[group];
  if (!options || options.indexOf(name) === -1) return;
  cfgSet(key, name);
}
