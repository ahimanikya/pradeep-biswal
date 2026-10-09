// Keep delivery disabled until an approved message endpoint is configured.
const contactForm = document.querySelector('#contact-form');
contactForm?.addEventListener('submit', event => {
  event.preventDefault();
  document.querySelector('#contact-status').textContent = 'Messages cannot be sent yet. Please try again when the contact form is available.';
});
