/** Fullscreens only the explorer (not the whole page). */
export function bindFullscreen(button, target) {
  if (!document.fullscreenEnabled) {
    button.hidden = true;
    return;
  }
  button.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else target.requestFullscreen().catch(() => {});
  });
}
