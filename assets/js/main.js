const toggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".main-nav");

if (toggle && nav) {
  const closeNav = () => {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeNav);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNav();
    }
  });

  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 861px)").matches) {
      closeNav();
    }
  });
}

const contactForm = document.querySelector(".contact-form");
const gasUrl = "https://script.google.com/macros/s/AKfycbz8nj8Y4_C9A7RNIOA8NO7Ky9zHnc2DownifGc3t_tItWkGwuI_RpCWboxRHfhYmNU/exec";

if (contactForm) {
  const submitButton = contactForm.querySelector('button[type="submit"]') || contactForm.querySelector("button");
  const statusMessage = document.createElement("p");
  statusMessage.id = "form-status";
  statusMessage.setAttribute("aria-live", "polite");
  contactForm.appendChild(statusMessage);

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (submitButton) {
      submitButton.disabled = true;
    }
    statusMessage.textContent = "送信中です...";

    const payload = {
      name: contactForm.querySelector('[name="name"]')?.value || "",
      company: contactForm.querySelector('[name="company"]')?.value || "",
      email: contactForm.querySelector('[name="email"]')?.value || "",
      category: contactForm.querySelector('[name="category"]')?.value || "",
      message: contactForm.querySelector('[name="message"]')?.value || "",
      website: contactForm.querySelector('[name="website"]')?.value || ""
    };

    try {
      await fetch(gasUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      statusMessage.textContent = "送信ありがとうございました。内容を確認してご返信します。";
      contactForm.reset();
    } catch (error) {
      statusMessage.textContent = "送信に失敗しました。時間をおいて再度お試しください。";
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
}
