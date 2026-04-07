function hideLoader() {
  const loader = document.querySelector('[data-page-loader]');

  if (loader) {
    loader.classList.add('is-hidden');
  }
}

function setupLightbox() {
  const images = document.querySelectorAll('.article-body img, .rich-copy img, .article-image');

  if (!images.length) {
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'lightbox';
  overlay.hidden = true;
  overlay.innerHTML = '<img alt="Expanded article image">';
  document.body.appendChild(overlay);

  const overlayImage = overlay.querySelector('img');

  const closeLightbox = () => {
    overlay.hidden = true;
    overlayImage.removeAttribute('src');
  };

  images.forEach((image) => {
    image.addEventListener('click', () => {
      overlay.hidden = false;
      overlayImage.src = image.currentSrc || image.src;
      overlayImage.alt = image.alt || 'Expanded article image';
    });
  });

  overlay.addEventListener('click', closeLightbox);
  window.addEventListener('scroll', closeLightbox, { passive: true });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeLightbox();
    }
  });
}

window.addEventListener('load', () => {
  hideLoader();
  setupLightbox();
});