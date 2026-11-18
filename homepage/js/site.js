(() => {
  const body = document.body;
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  const main = document.getElementById("main");
  const footer = document.querySelector(".site-footer");
  const label = toggle?.querySelector(".sr-only");
  let lastFocus = null;

  const setOpen = (open) => {
    const wasOpen = body.classList.contains("nav-open");
    body.classList.toggle("nav-open", open);
    toggle?.setAttribute("aria-expanded", String(open));
    if (label) label.textContent = open ? "关闭菜单" : "打开菜单";
    if (main) main.inert = open;
    if (footer) footer.inert = open;
    if (open) {
      lastFocus = document.activeElement;
      nav?.querySelector("a")?.focus();
      return;
    }
    if (wasOpen) {
      const back = lastFocus instanceof HTMLElement ? lastFocus : toggle;
      back?.focus();
    }
  };

  toggle?.addEventListener("click", () => {
    setOpen(!body.classList.contains("nav-open"));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });

  nav?.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest("a")) setOpen(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 720) setOpen(false);
  });

  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const current = page === "" ? "index.html" : page;
  document.querySelectorAll(".site-nav a, .footer-nav a").forEach((link) => {
    const href = (link.getAttribute("href") || "").split("#")[0].toLowerCase();
    if (href === current) link.setAttribute("aria-current", "page");
  });

  const form = document.querySelector(".contact-form");
  if (!form) return;

  const success = document.querySelector(".form-success");
  const again = document.querySelector("#write-another");
  const fields = [
    {
      name: "name",
      test: (value) => value.trim().length > 0,
      message: "请留下称呼。",
    },
    {
      name: "email",
      test: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
      message: "请填写有效的邮箱。",
    },
    {
      name: "message",
      test: (value) => value.trim().length >= 2,
      message: "请写一两句话。",
    },
  ];

  const showError = (input, message) => {
    const field = input.closest(".field");
    const error = field?.querySelector(".field-error");
    field?.classList.toggle("is-invalid", Boolean(message));
    input.setAttribute("aria-invalid", message ? "true" : "false");
    if (error) error.textContent = message || "";
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    let firstInvalid = null;
    fields.forEach(({ name, test, message }) => {
      const input = form.elements.namedItem(name);
      if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;
      const ok = test(input.value);
      showError(input, ok ? "" : message);
      if (!ok && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }
    form.hidden = true;
    if (success) {
      success.hidden = false;
      success.focus();
    }
  });

  form.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    if (!target.closest(".field")?.classList.contains("is-invalid")) return;
    const spec = fields.find((field) => field.name === target.name);
    if (spec) showError(target, spec.test(target.value) ? "" : spec.message);
  });

  again?.addEventListener("click", () => {
    form.reset();
    form.querySelectorAll(".field").forEach((field) => field.classList.remove("is-invalid"));
    form.querySelectorAll("[aria-invalid]").forEach((input) => {
      input.setAttribute("aria-invalid", "false");
    });
    form.querySelectorAll(".field-error").forEach((error) => {
      error.textContent = "";
    });
    form.hidden = false;
    if (success) success.hidden = true;
    form.querySelector("input")?.focus();
  });
})();
