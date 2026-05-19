import { RangeData } from '../types/gto';
import { Position } from '../types/game';

import BTN_open from '../data/gtoRanges/100bb/BTN_open.json';
import CO_open from '../data/gtoRanges/100bb/CO_open.json';
import UTG_open from '../data/gtoRanges/100bb/UTG_open.json';
import SB_open from '../data/gtoRanges/100bb/SB_open.json';
import BB_vs_BTN_3bet from '../data/gtoRanges/100bb/BB_vs_BTN_3bet.json';
import BTN_vs_BB_3bet_call from '../data/gtoRanges/100bb/BTN_vs_BB_3bet_call.json';
import BTN_vs_BB_3bet_fold from '../data/gtoRanges/100bb/BTN_vs_BB_3bet_fold.json';
import push_BTN_40 from '../data/gtoRanges/40bb/push_BTN.json';
import push_SB_40 from '../data/gtoRanges/40bb/push_SB.json';
import push_CO_40 from '../data/gtoRanges/40bb/push_CO.json';
import push_UTG_40 from '../data/gtoRanges/40bb/push_UTG.json';
import push_BTN_20 from '../data/gtoRanges/20bb/push_BTN.json';
import push_SB_20 from '../data/gtoRanges/20bb/push_SB.json';

export function getOpenRange(position: Position, stackDepth: '20bb' | '40bb' | '100bb'): RangeData | null {
  if (stackDepth === '20bb' || stackDepth === '40bb') {
    return getPushRange(position, stackDepth);
  }
  switch (position) {
    case 'BTN': return BTN_open as RangeData;
    case 'CO':  return CO_open as RangeData;
    case 'UTG':
    case 'UTG1':
    case 'UTG2': return UTG_open as RangeData;
    case 'SB':  return SB_open as RangeData;
    default:    return BTN_open as RangeData;
  }
}

export function get3BetRange(heroPos: Position, vsPosition: Position, stackDepth: '20bb' | '40bb' | '100bb'): RangeData | null {
  if (stackDepth !== '100bb') return null;
  if (heroPos === 'BB' && vsPosition === 'BTN') return BB_vs_BTN_3bet as RangeData;
  return null;
}

export function getCallVs3BetRange(heroPos: Position, stackDepth: '20bb' | '40bb' | '100bb'): RangeData | null {
  if (stackDepth !== '100bb') return null;
  if (heroPos === 'BTN') return BTN_vs_BB_3bet_call as RangeData;
  return null;
}

export function getFoldVs3BetRange(heroPos: Position, stackDepth: '20bb' | '40bb' | '100bb'): RangeData | null {
  if (stackDepth !== '100bb') return null;
  if (heroPos === 'BTN') return BTN_vs_BB_3bet_fold as RangeData;
  return null;
}

export function getPushRange(position: Position, stackDepth: '20bb' | '40bb'): RangeData | null {
  if (stackDepth === '40bb') {
    switch (position) {
      case 'BTN': return push_BTN_40 as RangeData;
      case 'SB':  return push_SB_40 as RangeData;
      case 'CO':  return push_CO_40 as RangeData;
      case 'UTG':
      case 'UTG1':
      case 'UTG2': return push_UTG_40 as RangeData;
      default:    return push_BTN_40 as RangeData;
    }
  }
  switch (position) {
    case 'BTN': return push_BTN_20 as RangeData;
    case 'SB':  return push_SB_20 as RangeData;
    default:    return push_BTN_20 as RangeData;
  }
}
