/**
 * VanGoghBench Institutional Privacy & Consent Governance Widget
 * Inspired by aurablox PrivacyAndContactWidget with Global Privacy Control (GPC) support.
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'vangogh_privacy_consent_v1';

  const DEFAULT_PREFS = {
    necessary: true,
    functional: true,
    analytics: true,
    doNotSellOrShare: false,
    contactPreference: 'research-only' // 'research-only' | 'updates' | 'opt-out-all'
  };

  function loadStoredConsent() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function saveStoredConsent(prefs) {
    try {
      const payload = {
        ...prefs,
        necessary: true,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return payload;
    } catch {
      return prefs;
    }
  }

  let prefs = { ...DEFAULT_PREFS };
  const stored = loadStoredConsent();
  const gpcEnabled = Boolean(navigator.globalPrivacyControl);

  if (stored) {
    prefs = { ...DEFAULT_PREFS, ...stored, necessary: true };
  } else if (gpcEnabled) {
    prefs.analytics = false;
    prefs.doNotSellOrShare = true;
  }

  function showToast(message = 'Privacy & opt-out preferences saved') {
    const existing = document.getElementById('van-prefs-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'van-prefs-toast';
    toast.className = 'van-prefs-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--chrome)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      if (toast && toast.parentNode) {
        toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        setTimeout(() => toast.remove(), 320);
      }
    }, 2800);
  }

  function hideBanner() {
    const banner = document.getElementById('van-privacy-banner');
    if (banner) {
      banner.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      banner.style.transform = 'translateY(100%)';
      setTimeout(() => banner.remove(), 320);
    }
  }

  let previousFocus = null;
  function openModal(activeTab = 'privacy') {
    previousFocus = document.activeElement;
    let modalBackdrop = document.getElementById('van-prefs-modal-backdrop');
    if (!modalBackdrop) {
      modalBackdrop = document.createElement('div');
      modalBackdrop.id = 'van-prefs-modal-backdrop';
      modalBackdrop.className = 'van-prefs-backdrop';
      modalBackdrop.setAttribute('role', 'dialog');
      modalBackdrop.setAttribute('aria-modal', 'true');
      modalBackdrop.setAttribute('aria-labelledby', 'van-prefs-modal-title');
      document.body.appendChild(modalBackdrop);
    }

    renderModalContent(modalBackdrop, activeTab);
    modalBackdrop.style.display = 'flex';
    document.getElementById('van-prefs-close-btn').focus();
  }

  function closeModal() {
    const modalBackdrop = document.getElementById('van-prefs-modal-backdrop');
    if (modalBackdrop) {
      modalBackdrop.style.display = 'none';
      if (previousFocus && previousFocus.isConnected) previousFocus.focus();
    }
  }

  function renderModalContent(container, activeTab) {
    container.innerHTML = `
      <div class="van-prefs-modal" onclick="event.stopPropagation()">
        <header class="van-prefs-modal__header">
          <div class="van-prefs-modal__tabs" role="tablist">
            <button type="button" class="van-prefs-modal__tab ${activeTab === 'privacy' ? 'is-active' : ''}" id="van-tab-btn-privacy">
              01 / Privacy &amp; Opt-Out
            </button>
            <button type="button" class="van-prefs-modal__tab ${activeTab === 'contact' ? 'is-active' : ''}" id="van-tab-btn-contact">
              02 / Research &amp; Contact
            </button>
          </div>
          <button type="button" class="van-prefs-modal__close" id="van-prefs-close-btn" aria-label="Close dialog">✕</button>
        </header>

        ${activeTab === 'privacy' ? `
          <div class="van-prefs-modal__body">
            <div class="van-prefs-modal__intro">
              <span class="van-prefs-modal__kicker">VANGOGH BENCH DATA GOVERNANCE</span>
              <h2 id="van-prefs-modal-title">Privacy &amp; Telemetry Preferences</h2>
              <p>
                Control how VanGoghBench records local interface settings and benchmark telemetry. We never sell visitor data, and we honor Global Privacy Control (GPC) signals automatically.
                <a href="privacy.html" style="text-decoration:underline;">Read the full privacy policy →</a>
              </p>
            </div>

            <div class="van-prefs-list">
              <div class="van-prefs-item">
                <div class="van-prefs-item__info">
                  <div class="van-prefs-item__head">
                    <strong>Strictly Necessary Local Storage</strong>
                    <span class="van-prefs-badge van-prefs-badge--locked">ALWAYS ACTIVE</span>
                  </div>
                  <p>
                    Required for core site reliability, preserving active canvas audio/speed state, and remembering your privacy choices locally in this browser.
                  </p>
                </div>
              </div>

              <label class="van-prefs-item" for="van-pref-functional">
                <div class="van-prefs-item__info">
                  <div class="van-prefs-item__head">
                    <strong>Functional UI Preferences</strong>
                  </div>
                  <p>
                    Remembers active model selections, rubric overlay lens modes (Placement ROIs, Swirl vectors), and playback speeds across visits.
                  </p>
                </div>
                <input id="van-pref-functional" type="checkbox" class="van-prefs-toggle" ${prefs.functional ? 'checked' : ''} />
              </label>

              <label class="van-prefs-item" for="van-pref-analytics">
                <div class="van-prefs-item__info">
                  <div class="van-prefs-item__head">
                    <strong>Benchmark Performance Telemetry</strong>
                  </div>
                  <p>
                    Aggregates non-identifying execution telemetry (render latency, AST verification results) to improve benchmark accuracy and detection thresholds.
                  </p>
                </div>
                <input id="van-pref-analytics" type="checkbox" class="van-prefs-toggle" ${(prefs.analytics && !prefs.doNotSellOrShare) ? 'checked' : ''} ${prefs.doNotSellOrShare ? 'disabled' : ''} />
              </label>

              <label class="van-prefs-item van-prefs-item--highlight" for="van-pref-optout">
                <div class="van-prefs-item__info">
                  <div class="van-prefs-item__head">
                    <strong>Global Opt-Out (Do Not Sell or Share / GPC)</strong>
                    <span class="van-prefs-badge">CCPA / CPRA / GDPR</span>
                  </div>
                  <p>
                    Enabling this records a strict opt-out against any third-party telemetry, non-essential caching, or external analytics.
                  </p>
                </div>
                <input id="van-pref-optout" type="checkbox" class="van-prefs-toggle" ${prefs.doNotSellOrShare ? 'checked' : ''} />
              </label>
            </div>

            <footer class="van-prefs-modal__footer">
              <button type="button" class="van-privacy-btn van-privacy-btn--secondary" id="van-btn-opt-out-all">
                Opt Out Non-Essential
              </button>
              <div class="van-prefs-modal__footer-right">
                <button type="button" class="van-privacy-btn van-privacy-btn--ghost" id="van-btn-accept-all">
                  Accept All
                </button>
                <button type="button" class="van-privacy-btn van-privacy-btn--primary" id="van-btn-save-custom">
                  Save My Preferences
                </button>
              </div>
            </footer>
          </div>
        ` : `
          <div class="van-prefs-modal__body">
            <div class="van-prefs-modal__intro">
              <span class="van-prefs-modal__kicker">RESEARCH DISCLOSURES &amp; INQUIRY CHANNELS</span>
              <h2 id="van-prefs-modal-title">Research &amp; Contact Preferences</h2>
              <p>
                VanGoghBench is open-source under Apache 2.0. Inquiries regarding model evaluations, reproducibility manifests, and research submissions are handled through public GitHub Issues or direct research channels.
              </p>
            </div>

            <div style="display:grid;gap:14px;margin-bottom:24px;">
              <div style="background:var(--night-deep,#090f22);border:1px solid var(--rule,rgba(243,234,211,0.18));border-radius:12px;padding:16px;">
                <span style="font-family:var(--font-mono);font-size:11px;color:var(--chrome);text-transform:uppercase;">MODEL SUBMISSION CI</span>
                <h4 style="margin:6px 0 4px;font-size:16px;color:var(--linen);">Automated GitHub Evaluation</h4>
                <p style="margin:0 0 10px;font-size:13px;color:var(--linen-dim);">Open an issue with candidate code to trigger headless Playwright evaluation and AST verification.</p>
                <a href="https://github.com/murderszn/vangogh-bench/issues/new?template=model_submission.yml" target="_blank" rel="noopener" class="van-privacy-btn van-privacy-btn--secondary sm" style="display:inline-flex;">Open Issue Form ↗</a>
              </div>

              <div style="background:var(--night-deep,#090f22);border:1px solid var(--rule,rgba(243,234,211,0.18));border-radius:12px;padding:16px;">
                <span style="font-family:var(--font-mono);font-size:11px;color:var(--cerulean);text-transform:uppercase;">REPOSITORY &amp; AUDITS</span>
                <h4 style="margin:6px 0 4px;font-size:16px;color:var(--linen);">GitHub Codebase &amp; Issues</h4>
                <p style="margin:0 0 10px;font-size:13px;color:var(--linen-dim);">Inspect the deterministic 5-pillar scoring algorithms, ground-truth reference coefficients, and anti-cheat AST scanner.</p>
                <a href="https://github.com/murderszn/vangogh-bench" target="_blank" rel="noopener" class="van-privacy-btn van-privacy-btn--secondary sm" style="display:inline-flex;">View on GitHub ↗</a>
              </div>
            </div>

            <footer class="van-prefs-modal__footer">
              <a href="privacy.html" class="van-privacy-btn van-privacy-btn--ghost">Read Full Privacy Policy →</a>
              <button type="button" class="van-privacy-btn van-privacy-btn--primary" id="van-btn-contact-done">Done</button>
            </footer>
          </div>
        `}
      </div>
    `;

    // Tab buttons
    const tabPrivacy = document.getElementById('van-tab-btn-privacy');
    const tabContact = document.getElementById('van-tab-btn-contact');
    if (tabPrivacy) tabPrivacy.onclick = () => renderModalContent(container, 'privacy');
    if (tabContact) tabContact.onclick = () => renderModalContent(container, 'contact');

    // Close button
    const closeBtn = document.getElementById('van-prefs-close-btn');
    if (closeBtn) closeBtn.onclick = closeModal;

    // Privacy actions
    const optOutAllBtn = document.getElementById('van-btn-opt-out-all');
    if (optOutAllBtn) {
      optOutAllBtn.onclick = () => {
        prefs = saveStoredConsent({
          necessary: true,
          functional: false,
          analytics: false,
          doNotSellOrShare: true,
          contactPreference: 'opt-out-all'
        });
        closeModal();
        hideBanner();
        showToast('All non-essential telemetry opted out');
      };
    }

    const acceptAllBtn = document.getElementById('van-btn-accept-all');
    if (acceptAllBtn) {
      acceptAllBtn.onclick = () => {
        prefs = saveStoredConsent({
          necessary: true,
          functional: true,
          analytics: true,
          doNotSellOrShare: false,
          contactPreference: 'research-only'
        });
        closeModal();
        hideBanner();
        showToast('All preferences accepted and saved');
      };
    }

    const saveCustomBtn = document.getElementById('van-btn-save-custom');
    if (saveCustomBtn) {
      saveCustomBtn.onclick = () => {
        const fn = document.getElementById('van-pref-functional').checked;
        const an = document.getElementById('van-pref-analytics').checked;
        const gpc = document.getElementById('van-pref-optout').checked;
        prefs = saveStoredConsent({
          necessary: true,
          functional: fn,
          analytics: gpc ? false : an,
          doNotSellOrShare: gpc,
          contactPreference: prefs.contactPreference || 'research-only'
        });
        closeModal();
        hideBanner();
        showToast('Custom privacy preferences saved');
      };
    }

    const contactDoneBtn = document.getElementById('van-btn-contact-done');
    if (contactDoneBtn) contactDoneBtn.onclick = closeModal;

    // Opt-out checkbox auto-disables analytics
    const optoutCheck = document.getElementById('van-pref-optout');
    const analyticsCheck = document.getElementById('van-pref-analytics');
    if (optoutCheck && analyticsCheck) {
      optoutCheck.onchange = (e) => {
        if (e.target.checked) {
          analyticsCheck.checked = false;
          analyticsCheck.disabled = true;
        } else {
          analyticsCheck.disabled = false;
        }
      };
    }
  }

  function renderFloatingDock() {
    if (document.getElementById('van-privacy-dock')) return;

    const dock = document.createElement('div');
    dock.id = 'van-privacy-dock';
    dock.className = 'van-privacy-dock';
    dock.setAttribute('aria-label', 'Privacy and data preferences');
    dock.innerHTML = `
      <button type="button" class="van-privacy-dock-btn" id="van-privacy-dock-trigger" aria-label="Privacy Settings and Consent Preferences" title="Privacy Settings & Opt-Out">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      </button>
    `;
    document.body.appendChild(dock);

    document.getElementById('van-privacy-dock-trigger').onclick = () => openModal('privacy');
  }

  document.addEventListener('keydown', event => {
    const dialog = document.getElementById('van-prefs-modal-backdrop');
    if (!dialog || dialog.style.display === 'none') return;
    if (event.key === 'Escape') { closeModal(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')]
      .filter(el => !el.disabled && el.getClientRects().length);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  function renderBanner() {
    if (stored) return; // already consented
    if (document.getElementById('van-privacy-banner')) return;

    const banner = document.createElement('aside');
    banner.id = 'van-privacy-banner';
    banner.className = 'van-privacy-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-labelledby', 'van-privacy-banner-title');
    banner.innerHTML = `
      <div class="van-privacy-banner__inner">
        <div class="van-privacy-banner__copy">
          <div class="van-privacy-banner__eyebrow">
            <span class="van-privacy-banner__seal" aria-hidden="true"></span>
            <span>PRIVACY &amp; DATA GOVERNANCE</span>
          </div>
          <h3 id="van-privacy-banner-title" class="van-privacy-banner__title">
            Your telemetry and privacy preferences stay in your control.
          </h3>
          <p class="van-privacy-banner__desc">
            VanGoghBench uses essential local storage to remember active playback controls and provide tamper-proof benchmark evaluations. We honor Global Privacy Control (GPC) signals and never sell visitor or telemetry data. Learn more in our <a href="privacy.html">Privacy Policy</a>.
          </p>
        </div>

        <div class="van-privacy-banner__actions">
          <button type="button" class="van-privacy-btn van-privacy-btn--ghost" id="van-banner-settings-btn">
            Preferences
          </button>
          <button type="button" class="van-privacy-btn van-privacy-btn--secondary" id="van-banner-optout-btn">
            Opt Out Non-Essential
          </button>
          <button type="button" class="van-privacy-btn van-privacy-btn--primary" id="van-banner-accept-btn">
            Accept All
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(banner);

    document.getElementById('van-banner-settings-btn').onclick = () => openModal('privacy');
    document.getElementById('van-banner-optout-btn').onclick = () => {
      prefs = saveStoredConsent({
        necessary: true,
        functional: false,
        analytics: false,
        doNotSellOrShare: true,
        contactPreference: 'opt-out-all'
      });
      hideBanner();
      showToast('Opted out of non-essential telemetry');
    };
    document.getElementById('van-banner-accept-btn').onclick = () => {
      prefs = saveStoredConsent({
        necessary: true,
        functional: true,
        analytics: true,
        doNotSellOrShare: false,
        contactPreference: 'research-only'
      });
      hideBanner();
      showToast('All preferences accepted');
    };
  }

  // Bind to any element with data-open-privacy-modal
  function bindOpenTriggers() {
    document.querySelectorAll('[data-open-privacy-modal]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('privacy');
      });
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      renderFloatingDock();
      renderBanner();
      bindOpenTriggers();
    });
  } else {
    renderFloatingDock();
    renderBanner();
    bindOpenTriggers();
  }

  // Expose global interface
  window.VanGoghPrivacy = {
    openModal,
    closeModal,
    getPreferences: () => ({ ...prefs }),
    showToast
  };
})();
