const CONTACT_GAS_URL = "https://script.google.com/macros/s/AKfycbxPW_C3A9gS2ddYq81IslgkXu0djREOdwiQeXCr4KQYnKfe9UQ0-EHViDcei3BOww/exec";

(function setupContactForm() {
  try {
    const contactForm = document.querySelector(".contact-form");

    if (!contactForm) {
      return;
    }

    const getPayload = () => {
      const formData = new FormData(contactForm);

      return {
        name: String(formData.get("name") || "").trim(),
        company: String(formData.get("company") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        category: String(formData.get("category") || "").trim(),
        message: String(formData.get("message") || "").trim()
      };
    };

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

      const payload = getPayload();

      try {
        await fetch(CONTACT_GAS_URL, {
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
        console.error("Contact form submission failed", error);
        statusMessage.textContent = "送信に失敗しました。時間をおいて再度お試しください。";
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
        }
      }
    }, true);
  } catch (error) {
    console.error("Contact form setup failed", error);
  }
})();

try {
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
} catch (error) {
  console.error("Navigation setup failed", error);
}
