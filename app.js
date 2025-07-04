// =========================
// ✅ Trial + Subscription Check
// =========================

const FORCE_SUBSCRIPTION_CHECK = undefined; // true or false for testing, undefined = normal behavior

async function checkSubscription() {
  if (typeof FORCE_SUBSCRIPTION_CHECK === "boolean") {
    return FORCE_SUBSCRIPTION_CHECK;
  }

  if (!window.Windows || !Windows.Services || !Windows.Services.Store) {
    console.warn("Store APIs unavailable — assuming non-Store environment");
    return isTrialActive();
  }

  const context = Windows.Services.Store.StoreContext.getDefault();
  const addOns = await context.getStoreProductsAsync(["Subscription"]);
  const sub = addOns.products.lookup("9PLHW551GBFC");

  if (sub && sub.hasLicense && sub.license.isActive) {
    return true;
  }

  return isTrialActive();
}

function isTrialActive() {
  const savedDate = localStorage.getItem("firstRunDate");
  const today = new Date();

  if (!savedDate) {
    localStorage.setItem("firstRunDate", today.toISOString());
    return true;
  }

  const firstRun = new Date(savedDate);
  const diffDays = Math.floor((today - firstRun) / (1000 * 60 * 60 * 24));
  return diffDays <= 7;
}

function showFullscreen(src) {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.zIndex = 9999;

  const img = document.createElement('img');
  img.src = src;
  img.style.maxWidth = '90vw';
  img.style.maxHeight = '90vh';
  img.style.borderRadius = '16px';
  img.style.boxShadow = '0 0 30px rgba(255,255,255,0.2)';
  img.onclick = () => document.body.removeChild(overlay);

  overlay.appendChild(img);
  document.body.appendChild(overlay);
}

// =========================
// 🚀 App Initialization
// =========================

document.addEventListener("DOMContentLoaded", async () => {
  const promptEl = document.getElementById('prompt');
  const subscribeBtn = document.getElementById("subscribeBtn");
  const genBtn = document.getElementById('generate') || document.getElementById("generateBtn");
  const gallery = document.getElementById('gallery');

  let status = document.getElementById("statusMessage");
  if (!status) {
    status = document.createElement('div');
    status.id = "statusMessage";
    status.style.color = "#ffcc00";
    status.style.textAlign = "center";
    status.style.marginTop = "12px";
    document.body.appendChild(status);
  }

  // 🔐 Check subscription status
  const isSubscribed = await checkSubscription();

  if (!isSubscribed) {
    if (genBtn) genBtn.disabled = true;
    status.textContent = "⚠️ Please subscribe first to use MagicPrompt.";
    return;
  }

  genBtn.disabled = false;

  // 🌠 Image generation
  genBtn.addEventListener('click', async () => {
    const txt = promptEl.value.trim();
    if (!txt) return;

    genBtn.disabled = true;

    const card = document.createElement('div');
    card.className = 'card';
    card.textContent = 'Generating...';
    gallery.prepend(card);
    promptEl.value = '';

    try {
      const res = await fetch('https://api.deepai.org/api/text2img', {
        method: 'POST',
        headers: {
          'Api-Key': '4e875ad8-76b7-403a-8d28-5e1ebb881249',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: txt })
      });

      if (!res.ok) {
        throw new Error("Image generation API error: " + res.statusText);
      }

      const data = await res.json();
      const url = data.output_url;
      card.innerHTML = `<img src="${url}" alt="AI Image" class="full-size" onclick="showFullscreen(this.src)" /><br/><a class="download" href="${url}" download="generated.png">Download Full</a>`;
    } catch (e) {
      console.error(e);
      card.textContent = 'Error generating image';
    } finally {
      genBtn.disabled = false;
    }
  });

  // 💳 Subscribe button logic — only one clean event
  if (subscribeBtn) {
    subscribeBtn.addEventListener('click', async () => {
      try {
        const context = Windows.Services.Store.StoreContext.getDefault();
        const result = await context.requestPurchaseAsync("9PLHW551GBFC");
        if (result.status === Windows.Services.Store.StorePurchaseStatus.succeeded) {
          location.reload(); // Reload to recheck subscription
        } else {
          status.textContent = "⚠️ Subscription not completed.";
        }
      } catch (err) {
        console.error("Purchase failed:", err);
        status.textContent = "⚠️ Error while purchasing.";
      }
    });
  }
});