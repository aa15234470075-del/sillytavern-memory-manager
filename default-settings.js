import {DEFAULTS} from './core.js?v=0.5.8';
// Deliberately excludes addresses, model IDs, keys, character data and floor cursors.
export function defaultProfileOptions(){const options=structuredClone(DEFAULTS);for(const k of ['baseUrl','model','checkBaseUrl','checkModel','repairBaseUrl','repairModel','profiles','attics','booksByCharacter','worldBooks','startFloor','autoStartFloor','connectionPreset'])delete options[k];return options;}
export const DEFAULT_PROFILE_ID='smm-builtin-default-v057';
