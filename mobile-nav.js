(() => {
  const toggle = document.getElementById("menuToggle");
  const drawer = document.getElementById("mobileNav");
  const backdrop = document.getElementById("mobileNavBackdrop");
  if (!toggle || !drawer || !backdrop) return;

  const setOpen = (open) => {
    drawer.classList.toggle("open", open);
    backdrop.classList.toggle("open", open);
    document.body.classList.toggle("mobile-nav-open", open);
  };

  toggle.addEventListener("click", () => setOpen(!drawer.classList.contains("open")));
  backdrop.addEventListener("click", () => setOpen(false));
  drawer.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => setOpen(false));
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 980) setOpen(false);
  });
})();
