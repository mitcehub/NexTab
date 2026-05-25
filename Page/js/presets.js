import { cfgSet, applyConfig } from './store.js';

export var STYLE_OPTIONS = {
  clock: ['classic', 'glow', 'outline', 'shadow', 'gradient', 'hologram', 'lcd', 'neon'],
  search: ['pill', 'glass', 'border', 'minimal', 'neumorphism', 'spotlight', 'glowborder', 'acrylic'],
  site: ['round', 'card', 'outline', 'minimal', 'squircle', '3d', 'hoverglow', 'neumorphic']
};

export function applyPreset(group, name) {
  var key = group + '_style';
  var options = STYLE_OPTIONS[group];
  if (!options || options.indexOf(name) === -1) return;
  cfgSet(key, name);
}

export function applySuite(suiteName) {
  if (suiteName === 'cyberpunk') {
    cfgSet('clock_style', 'neon');
    cfgSet('search_style', 'glowborder');
    cfgSet('site_style', 'hoverglow');
    cfgSet('mask_opacity', '50');
    cfgSet('bg_blur', '2');
  } else if (suiteName === 'neumorphism') {
    cfgSet('clock_style', 'shadow');
    cfgSet('search_style', 'neumorphism');
    cfgSet('site_style', 'neumorphic');
    cfgSet('mask_opacity', '60');
    cfgSet('bg_blur', '5');
  } else if (suiteName === 'glassmorphism') {
    cfgSet('clock_style', 'hologram');
    cfgSet('search_style', 'acrylic');
    cfgSet('site_style', 'squircle');
    cfgSet('mask_opacity', '30');
    cfgSet('bg_blur', '10');
  } else if (suiteName === 'modern') {
    cfgSet('clock_style', 'gradient');
    cfgSet('search_style', 'spotlight');
    cfgSet('site_style', '3d');
    cfgSet('mask_opacity', '40');
    cfgSet('bg_blur', '0');
  } else if (suiteName === 'classic') {
    cfgSet('clock_style', 'classic');
    cfgSet('search_style', 'pill');
    cfgSet('site_style', 'round');
    cfgSet('mask_opacity', '30');
    cfgSet('bg_blur', '0');
  }
}
