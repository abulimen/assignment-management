// Route table: pattern → handler. :param segments capture path params.
import register from './register.js';
import login from './login.js';
import me from './me.js';
import refresh from './refresh.js';
import logout from './logout.js';
import verifyEmail from './verifyEmail.js';
import resendVerification from './resendVerification.js';
import forgotPassword from './forgotPassword.js';
import resetPassword from './resetPassword.js';
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
  { method: 'GET', pattern: '/api/me', handler: me },
  { method: 'POST', pattern: '/api/refresh', handler: refresh },
  { method: 'POST', pattern: '/api/logout', handler: logout },
  { method: 'GET', pattern: '/api/verify-email', handler: verifyEmail },
  { method: 'POST', pattern: '/api/resend-verification', handler: resendVerification },
  { method: 'POST', pattern: '/api/forgot-password', handler: forgotPassword },
  { method: 'POST', pattern: '/api/reset-password', handler: resetPassword },
  { method: 'GET', pattern: '/api/assignments', handler: assignments },
  { method: 'POST', pattern: '/api/assignments', handler: assignments },
  { method: 'GET', pattern: '/api/assignments/:id', handler: assignment },
  { method: 'PUT', pattern: '/api/assignments/:id', handler: assignment },
  { method: 'DELETE', pattern: '/api/assignments/:id', handler: assignment },
  { method: 'GET', pattern: '/api/assignments/:id/groups', handler: assignGroups },
  { method: 'POST', pattern: '/api/groups', handler: createGroup },
  { method: 'POST', pattern: '/api/groups/join', handler: joinGroup },
  { method: 'GET', pattern: '/api/groups/:id', handler: group },
  { method: 'GET', pattern: '/api/submissions', handler: submissions },
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