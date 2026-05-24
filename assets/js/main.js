const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".main-nav");

if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

document.querySelectorAll("[data-demo-submit]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    const form = button.closest("form");
    if (!form) return;
    form.classList.add("submitted");
    button.textContent = "送信内容を確認しました";
    setTimeout(() => {
      button.textContent = "相談内容を送信する";
      form.classList.remove("submitted");
    }, 2200);
  });
});
