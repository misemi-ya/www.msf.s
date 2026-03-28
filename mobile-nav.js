(() => {
  const menuToggle = document.getElementById("menuToggle");
  const accountToggle = document.getElementById("accountToggle");
  const drawer = document.getElementById("mobileNav");
  const accountMenu = document.getElementById("accountMenu");
  const backdrop = document.getElementById("mobileNavBackdrop");
  if (!menuToggle || !drawer || !backdrop) return;

  const setMenuOpen = (open) => {
    drawer.classList.toggle("open", open);
    backdrop.classList.toggle("open", open);
    document.body.classList.toggle("mobile-nav-open", open);
  };

  const setAccountOpen = (open) => {
    if (!accountMenu) return;
    accountMenu.classList.toggle("open", open);
    backdrop.classList.toggle("open", drawer.classList.contains("open"));
  };

  menuToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    setAccountOpen(false);
    setMenuOpen(!drawer.classList.contains("open"));
  });

  accountToggle?.addEventListener("click", (event) => {
    event.stopPropagation();
    setMenuOpen(false);
    setAccountOpen(!accountMenu.classList.contains("open"));
  });

  backdrop.addEventListener("click", () => {
    setMenuOpen(false);
    setAccountOpen(false);
  });

  drawer.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      setMenuOpen(false);
    });
  });

  document.addEventListener("click", (event) => {
    if (accountMenu && accountMenu.classList.contains("open") && !accountMenu.contains(event.target) && !accountToggle?.contains(event.target)) {
      setAccountOpen(false);
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 980) {
      setMenuOpen(false);
      setAccountOpen(false);
    }
  });
})();
