const toggle = document.querySelector('.menu-toggle');
const index = document.querySelector('#site-index');
function setMenu(open) {
  if (!toggle || !index) return;
  toggle.setAttribute('aria-expanded', String(open));
  index.hidden = !open;
}
if (toggle && index) {
  toggle.addEventListener('click', () => setMenu(index.hidden));
  index.addEventListener('click', event => { if(event.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', event => {
    if(event.key === 'Escape' && !index.hidden) { setMenu(false); toggle.focus(); }
  });
  document.addEventListener('click', event => {
    if(!index.hidden && !index.contains(event.target) && !toggle.contains(event.target)) setMenu(false);
  });
}
const search = document.querySelector('#contents-search');
if (search) {
  const links = [...document.querySelectorAll('#contents-links a')];
  search.addEventListener('input', () => {
    const value = search.value.trim().toLocaleLowerCase();
    let count = 0;
    links.forEach(link => {
      link.hidden = !link.textContent.toLocaleLowerCase().includes(value);
      if (!link.hidden) count++;
    });
    document.querySelector('#contents-count').textContent = `${count} of ${links.length} titles`;
    document.querySelector('#contents-empty').hidden = count !== 0;
  });
}
// Memories are independent documents; preserve previously shared fragment links.
const memoryRoutes = document.querySelector('#memory-route-map');
if (memoryRoutes) {
  const routes = JSON.parse(memoryRoutes.textContent);
  const followMemoryLink = () => {
    const destination = routes[location.hash.slice(1)];
    if (destination) location.replace(new URL(destination, location.href).href);
  };
  followMemoryLink();
  window.addEventListener('hashchange', followMemoryLink);
}
const memoryStory = document.querySelector('.memory-story');
if (memoryStory) {
  const copy = document.querySelector('.memory-copy');
  const share = document.querySelector('.memory-share');
  const status = document.querySelector('.share-status');
  const url = new URL(location.href);
  url.hash = ''; url.search = '';
  const shareUrl = url.href;
  const fallback = () => {
    const panel = document.querySelector('.share-fallback');
    const input = panel.querySelector('input');
    panel.hidden = false; input.value = shareUrl;
    input.focus(); input.select();
    status.textContent = 'Select and copy the article link.';
  };
  copy.hidden = false;
  copy.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) return fallback();
      await navigator.clipboard.writeText(shareUrl);
      status.textContent = 'Link copied.';
    } catch { fallback(); }
  });
  if (navigator.share) {
    share.hidden = false;
    share.addEventListener('click', async () => {
      try { await navigator.share({ title: document.querySelector('h1').textContent, url: shareUrl }); }
      catch (error) { if (error.name !== 'AbortError') fallback(); }
    });
  }
  document.querySelector('.memory-comment-form').addEventListener('submit', event => event.preventDefault());
}
// Progressive enhancement: without JavaScript every archived image remains visible.
const collection = document.querySelector('[data-collection]');
if (collection) {
  const figures = [...collection.querySelectorAll('figure')];
  const toolbar = document.querySelector('.gallery-tools');
  const more = document.querySelector('.gallery-more');
  let category = 'all', visibleCount = 24;
  const matching = () => figures.filter(figure => category === 'all' || figure.dataset.category === category);
  const render = () => {
    const matches = matching();
    figures.forEach(figure => { figure.hidden = true; });
    matches.slice(0, visibleCount).forEach(figure => { figure.hidden = false; });
    toolbar.querySelector('.gallery-status').textContent = `Showing ${Math.min(visibleCount, matches.length)} of ${matches.length} images`;
    more.hidden = visibleCount >= matches.length;
    collection.dataset.activeCategory = category;
  };
  toolbar.hidden = false;
  toolbar.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    category = button.dataset.filter; visibleCount = 24;
    toolbar.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    render();
  }));
  more.addEventListener('click', () => {
    const firstNew = matching()[visibleCount];
    visibleCount += 24; render();
    firstNew?.querySelector('a').focus();
  });
  render();
}
const viewer = document.querySelector('#image-viewer');
if (viewer && typeof viewer.showModal === 'function') {
  let links = [...document.querySelectorAll('a[data-lightbox]')];
  let current = 0, opener;
  const previous = viewer.querySelector('.viewer-prev'), next = viewer.querySelector('.viewer-next');
  function showImage(position) {
    current = position;
    const link = links[current], image = viewer.querySelector('img');
    const caption = link.querySelector('img')?.alt || link.getAttribute('aria-label') || 'Original image';
    image.hidden = false;
    image.src = link.href;
    image.alt = caption;
    viewer.querySelector('.viewer-original').href = link.dataset.sourceOriginal || link.href;
    viewer.querySelector('.viewer-download').href = link.href;
    viewer.querySelector('#viewer-caption').textContent = caption;
    viewer.querySelector('.viewer-count').textContent = `${current + 1} / ${links.length}`;
    previous.disabled = current === 0;
    next.disabled = current === links.length - 1;
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-lightbox]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();opener = link;
    const scope = link.closest('.home-carousel') || link.closest('[data-collection]') || document;
    links = [...scope.querySelectorAll('a[data-lightbox]')].filter(item => {
      const category = scope.dataset?.activeCategory;
      return !category || category === 'all' || item.closest('figure')?.dataset.category === category;
    });
    showImage(links.indexOf(link));viewer.showModal();
  });
  viewer.querySelector('img').addEventListener('error', () => {
    viewer.querySelector('img').hidden = true;
    viewer.querySelector('#viewer-caption').textContent = 'This image could not be loaded. Try Open original image below.';
  });
  previous?.addEventListener('click', () => { if(current > 0) showImage(current - 1); });
  next?.addEventListener('click', () => { if(current < links.length - 1) showImage(current + 1); });
  viewer.addEventListener('keydown', event => {
    if(event.key === 'ArrowLeft' && current > 0) { event.preventDefault();showImage(current - 1); }
    if(event.key === 'ArrowRight' && current < links.length - 1) { event.preventDefault();showImage(current + 1); }
  });
  viewer.querySelector('.viewer-close').addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', event => {
    if (event.target !== viewer) return;
    const bounds = viewer.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) viewer.close();
  });
  viewer.addEventListener('close', () => opener?.focus());
}

// Native scrolling supports touch, trackpads and keyboard without autoplay.
document.querySelectorAll('.home-carousel').forEach(section => {
  const track = section.querySelector('.carousel-track');
  const previous = section.querySelector('.carousel-previous');
  const next = section.querySelector('.carousel-next');
  const update = () => {
    previous.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
  };
  const move = direction => {
    const card = track.firstElementChild;
    const step = card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap);
    const count = Math.max(1, Math.floor((track.clientWidth + 1) / step));
    track.scrollBy({left:direction * step * count, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  };
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('scroll', update, {passive:true});
  track.addEventListener('keydown', event => {
    if(event.target !== track || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    if(event.key === 'Home' || event.key === 'End') track.scrollTo({left:event.key === 'Home' ? 0 : track.scrollWidth});
    else move(event.key === 'ArrowLeft' ? -1 : 1);
  });
  new ResizeObserver(update).observe(track);
  update();
});
// Start with a random testimonial; navigation wraps through the complete collection.
const testimonialTemplate = document.querySelector('#testimonial-quotes');
if (testimonialTemplate) {
  const quotes = [...testimonialTemplate.content.querySelectorAll('article')];
  const currentQuote = document.querySelector('#testimonial-current');
  const controls = document.querySelector('.testimonial-controls');
  let position = Math.floor(Math.random() * quotes.length);
  const showQuote = nextPosition => {
    position = (nextPosition + quotes.length) % quotes.length;
    currentQuote.replaceChildren(...[...quotes[position].childNodes].map(node => node.cloneNode(true)));
  };
  if (quotes.length && currentQuote && controls) {
    showQuote(position);
    controls.hidden = false;
    controls.querySelector('.testimonial-prev').addEventListener('click', () => showQuote(position - 1));
    controls.querySelector('.testimonial-next').addEventListener('click', () => showQuote(position + 1));
  }
}
