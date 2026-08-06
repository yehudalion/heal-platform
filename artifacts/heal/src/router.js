const routes = new Map();

export function route(path, handler) {
  routes.set(path, handler);
}

export function navigate(path) {
  if (location.hash !== '#' + path) {
    location.hash = '#' + path;
  } else {
    handle();
  }
}

let rootEl = null;

export function startRouter(el) {
  rootEl = el;
  window.addEventListener('hashchange', handle);
  if (!location.hash) {
    location.hash = '#/';
  } else {
    handle();
  }
}

/**
 * Everything after the route path — a second '#' or a '?'. The URL only has one
 * real fragment, so a deep link into a section is written as
 * '#/rephrase-learn#rl-block-added'; without stripping it here that whole string
 * would fail to match any route and silently fall through to home.
 * @returns {string} e.g. 'rl-block-added', or '' when there is none
 */
export function subAnchor() {
  const raw = location.hash.replace(/^#/, '');
  const i = raw.search(/[?#]/);
  return i === -1 ? '' : raw.slice(i + 1);
}

async function handle() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const path = raw.split(/[?#]/)[0] || '/';
  const handler = routes.get(path) || routes.get('/');
  if (!handler) return;
  await handler(rootEl);
}
