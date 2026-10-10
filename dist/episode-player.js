/* Load a single privacy-enhanced YouTube player only after a reader requests it. */
(() => {
  const players = [...document.querySelectorAll('.episode-player')];
  for (const player of players) {
    const id = player.dataset.videoId;
    if (!/^[A-Za-z0-9_-]{11}$/.test(id || '')) continue;
    const button = player.querySelector('button');
    if (!button) continue;
    player.hidden = false;
    button.addEventListener('click', () => {
      // Stop an earlier episode before starting another, including audio off-screen.
      for (const previous of players) {
        previous.querySelector('iframe')?.remove();
        const trigger = previous.querySelector('button');
        if (trigger) trigger.hidden = false;
      }
      const frame = document.createElement('iframe');
      frame.title = player.dataset.videoTitle;
      frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`;
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      button.hidden = true;
      player.append(frame);
      frame.focus();
    });
  }
})();
