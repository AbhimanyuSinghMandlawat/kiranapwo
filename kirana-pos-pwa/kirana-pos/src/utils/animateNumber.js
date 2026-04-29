export function animateNumber(el, end, duration = 800) {
  let start = 0;
  const step = Math.max(1, Math.floor(end / (duration / 16)));

  function update() {
    start += step;
    if (start >= end) {
      el.textContent = end;
    } else {
      el.textContent = start;
      requestAnimationFrame(update);
    }
  }

  update();
}
