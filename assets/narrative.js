// Update the biography marker only as milestones enter the reading area.
(() => {
  const track = document.querySelector('.journey-track');
  if (!track) return;
  const stops = [...track.querySelectorAll('.journey-stop')];
  const year = document.querySelector('[data-journey-year]');
  const activate = (stop) => {
    stops.forEach((item) => item.classList.toggle('is-current', item === stop));
    track.style.setProperty('--journey-progress', (stops.indexOf(stop) + 1) / stops.length);
    if (year) year.textContent = stop.dataset.journeyEra;
  };
  if (!stops.length) return;
  activate(stops[0]);
  if ('IntersectionObserver' in window) {
    const visible = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({isIntersecting, target}) => isIntersecting ? visible.add(target) : visible.delete(target));
      const candidates = [...visible];
      if (!candidates.length) return;
      const midpoint = window.innerHeight * .45;
      candidates.sort((a, b) => Math.abs(a.getBoundingClientRect().top - midpoint) - Math.abs(b.getBoundingClientRect().top - midpoint));
      activate(candidates[0]);
    }, {rootMargin: '-15% 0px -25% 0px', threshold: [0, .3, .6]});
    stops.forEach((stop) => observer.observe(stop));
  }
})();

(() => {
 const loop=document.querySelector('.agent-loop');
 if(loop && 'IntersectionObserver' in window)new IntersectionObserver(entries=>{loop.classList.toggle('is-in-view',entries[0].isIntersecting);},{threshold:.15}).observe(loop);
})();
