import { useEffect, useRef } from "react";

const thumbHeight = 60;
const startInset = 20;

export default function TeamWorkspaceScrollbar({ scrollContainer, pathname }) {
  const track = useRef(null);
  const thumb = useRef(null);
  const dragOffset = useRef(null);

  useEffect(() => {
    const target = scrollContainer.current;
    const rail = track.current;
    const indicator = thumb.current;
    if (!target || !rail || !indicator) return;

    const update = () => {
      const range = target.scrollHeight - target.clientHeight;
      const travel = Math.max(0, rail.clientHeight - thumbHeight - startInset);
      const offset = range > 0 ? (target.scrollTop / range) * travel : 0;
      indicator.style.transform = `translateY(${startInset + offset}px)`;
      rail.classList.toggle("team-scrollbar--scrollable", range > 0);
    };
    target.addEventListener("scroll", update, { passive: true });
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    const observeContent = () => {
      resize?.disconnect();
      resize?.observe(target);
      if (target.firstElementChild) resize?.observe(target.firstElementChild);
      update();
    };
    const children = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.target === target)) observeContent();
      else update();
    });
    // The Telegram decline form can change scrollHeight without resizing its parent.
    children.observe(target, { childList: true, subtree: /^\/telegram-bot\/?$/.test(pathname) });
    observeContent();
    return () => {
      target.removeEventListener("scroll", update);
      resize?.disconnect();
      children.disconnect();
    };
  }, [scrollContainer, pathname]);

  function move(clientY) {
    const target = scrollContainer.current;
    const rect = track.current.getBoundingClientRect();
    const travel = rect.height - thumbHeight - startInset;
    if (travel <= 0 || !target || dragOffset.current === null) return;
    const position = (clientY - rect.top - startInset - dragOffset.current) / travel;
    target.scrollTop = Math.min(1, Math.max(0, position)) *
      (target.scrollHeight - target.clientHeight);
  }

  return (
    <div className="team-scrollbar" ref={track} aria-hidden="true"
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.currentTarget.classList.contains("team-scrollbar--scrollable")) return;
        event.preventDefault();
        dragOffset.current = event.target === thumb.current
          ? event.clientY - thumb.current.getBoundingClientRect().top
          : thumbHeight / 2;
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event.clientY);
      }}
      onPointerMove={(event) => move(event.clientY)}
      onLostPointerCapture={() => { dragOffset.current = null; }}
      onWheel={(event) => {
        const target = scrollContainer.current;
        if (!target) return;
        const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? target.clientHeight : 1;
        target.scrollTop += event.deltaY * unit;
      }}
    >
      <span ref={thumb} />
    </div>
  );
}
