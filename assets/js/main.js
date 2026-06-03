const gasUrl = "https://script.google.com/macros/s/AKfycbz8nj8Y4_C9A7RNIOA8NO7Ky9zHnc2DownifGc3t_tItWkGwuI_RpCWboxRHfhYmNU/exec";

(function setupContactForm() {
  try {
    const contactForm = document.querySelector(".contact-form");

    if (!contactForm) {
      return;
    }

    const getFieldValue = (name) => {
      const field = contactForm.querySelector('[name="' + name + '"]');
      return field ? field.value : "";
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

      const payload = {
        name: getFieldValue("name"),
        company: getFieldValue("company"),
        email: getFieldValue("email"),
        category: getFieldValue("category"),
        message: getFieldValue("message")
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
