// Route table: pattern → handler. :param segments capture path params.
import register from './register.js';
import login from './login.js';
import assignments from './assignments.js';
import assignment from './assignment.js';
import assignGroups from './assignGroups.js';
import createGroup from './createGroup.js';
import joinGroup from './joinGroup.js';
import group from './group.js';
import submissions from './submissions.js';
import submission from './submission.js';
import events from './events.js';
import playback from './playback.js';
import verdict from './verdict.js';
import groupStatus from './groupStatus.js';
import groupSubmit from './groupSubmit.js';

export const routes = [
  { method: 'POST', pattern: '/api/register', handler: register },
  { method: 'POST', pattern: '/api/login', handler: login },
  { method: 'GET', pattern: '/api/assignments', handler: assignments },
  { method: 'POST', pattern: '/api/assignments', handler: assignments },
  { method: 'GET', pattern: '/api/assignments/:id', handler: assignment },
  { method: 'PUT', pattern: '/api/assignments/:id', handler: assignment },
  { method: 'DELETE', pattern: '/api/assignments/:id', handler: assignment },
  { method: 'GET', pattern: '/api/assignments/:id/groups', handler: assignGroups },
  { method: 'POST', pattern: '/api/groups', handler: createGroup },
  { method: 'POST', pattern: '/api/groups/join', handler: joinGroup },
  { method: 'GET', pattern: '/api/groups/:id', handler: group },
  { method: 'POST', pattern: '/api/submissions', handler: submissions },
  { method: 'GET', pattern: '/api/submissions/:id', handler: submission },
  { method: 'PUT', pattern: '/api/submissions/:id', handler: submission },
  { method: 'POST', pattern: '/api/submissions/:id/submit', handler: submission },
  { method: 'POST', pattern: '/api/events', handler: events },
  { method: 'GET', pattern: '/api/submissions/:id/playback', handler: playback },
  { method: 'GET', pattern: '/api/submissions/:id/verdict', handler: verdict },
  { method: 'POST', pattern: '/api/groups/:id/submit', handler: groupSubmit },
  { method: 'POST', pattern: '/api/groups/:id/:action', handler: groupStatus },
];

export function matchRoute(pattern, path) {
  const pat = pattern.split('/').filter(Boolean);
  const parts = path.split('/').filter(Boolean);
  if (pat.length !== parts.length) return null;
  const params = {};
  for (let i = 0; i < pat.length; i++) {
    if (pat[i].startsWith(':')) params[pat[i].slice(1)] = decodeURIComponent(parts[i]);
    else if (pat[i] !== parts[i]) return null;
  }
  return params;
}