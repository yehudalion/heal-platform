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

async function handle() {
  const path = location.hash.replace(/^#/, '') || '/';
  const handler = routes.get(path) || routes.get('/');
  if (!handler) return;
  await handler(rootEl);
}
