/* ==========================================================
   NeuroScan Landing — script.js
   ----------------------------------------------------------
   Содержит:
   1) Слайдер «До / После»
   2) Переключатель сегментов ЦА (Гос / Частные)
   3) Табы «Как это работает»
   4) Калькулятор экономии
   5) A/B-тест заголовка H1
   6) Валидация + отправка формы в Google Sheets
   ========================================================== */

(function () {
  'use strict';
  /* ============================================================
     НАСТРОЙКИ
     ============================================================ */
  const GOOGLE_SHEET_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycby77lK7PFPpusDM2o2R0pkxYuWhogo_yr3UI2hjQ-E8MKNUgG9jUTXJjFqGzLmObXLsTQ/exec';

  // Параметры калькулятора
  const IMPL_COST = 900000;   
  const EFFICIENCY = 0.35;    

  // Флаг A/B-теста: включить/выключить
  const AB_TEST_ENABLED = true;

  // Показывать ли отладку в консоли
  const DEBUG = true;

  const log = (...args) => { if (DEBUG) console.log('[NeuroScan]', ...args); };
  const warn = (...args) => { if (DEBUG) console.warn('[NeuroScan]', ...args); };

  log('script.js loaded ✓');

  /* ============================================================
     1) СЛАЙДЕР «ДО / ПОСЛЕ»
     ============================================================ */
  const slider = document.getElementById('scanSlider');
  const overlay = document.getElementById('scanOverlay');
  const divider = document.getElementById('scanDivider');
  const handle = document.getElementById('scanHandle');

  if (slider && overlay && divider && handle) {
    const update = (v) => {
      overlay.style.clipPath = 'inset(0 0 0 ' + v + '%)';
      divider.style.left = v + '%';
      handle.style.left = v + '%';
    };
    slider.addEventListener('input', (e) => update(e.target.value));
    update(slider.value); // синхронизация при загрузке
    log('✓ Slider ready');
  } else {
    warn('Slider: элементы не найдены');
  }

  /* ============================================================
     2) ПЕРЕКЛЮЧАТЕЛЬ СЕГМЕНТОВ ЦА
     ============================================================ */
  const heroBadge = document.getElementById('heroBadge');
  const heroSub = document.getElementById('heroSub');
  const segmentSwitch = document.getElementById('segmentSwitch');

  const segments = {
    state: {
      badge: 'Для государственных учреждений',
      sub: 'Зарегистрированная медицинская нейросеть, которая находит до 95% скрытых патологий и формирует черновик заключения для врача-рентгенолога. Оптимизирована под ОМС, отчётность и интеграцию с PACS.'
    },
    private: {
      badge: 'Для частных клиник',
      sub: 'Зарегистрированная медицинская нейросеть, которая находит до 95% скрытых патологий и формирует черновик заключения для врача-рентгенолога. Повышает средний чек, удержание пациентов и скорость обслуживания.'
    }
  };

  if (segmentSwitch && heroBadge && heroSub) {
    const btns = segmentSwitch.querySelectorAll('button');
    btns.forEach((btn) => {
      btn.addEventListener('click', () => {
        btns.forEach((x) => x.classList.remove('active'));
        btn.classList.add('active');
        const data = segments[btn.dataset.segment];
        if (data) {
          heroBadge.textContent = data.badge;
          heroSub.textContent = data.sub;
          log('Segment →', btn.dataset.segment);
        }
      });
    });
    log('✓ Segment switch ready');
  } else {
    warn('Segment switch: элементы не найдены');
  }

  /* ============================================================
     3) ТАБЫ «КАК ЭТО РАБОТАЕТ»
     ============================================================ */
  const howTabs = document.getElementById('howTabs');

  if (howTabs) {
    const btns = howTabs.querySelectorAll('button');
    const panels = document.querySelectorAll('.tab-panel');
    btns.forEach((btn) => {
      btn.addEventListener('click', () => {
        btns.forEach((x) => x.classList.remove('active'));
        panels.forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        const panel = document.querySelector('.tab-panel[data-panel="' + btn.dataset.tab + '"]');
        if (panel) panel.classList.add('active');
      });
    });
    log('✓ Tabs ready');
  } else {
    warn('Tabs: контейнер не найден');
  }

  /* ============================================================
     4) КАЛЬКУЛЯТОР
     ============================================================ */
  const fmt = (n) => new Intl.NumberFormat('ru-RU').format(Math.round(n)) + ' ₽';

  function updateCalculator() {
    const sEl = document.getElementById('calcScans');
    const tEl = document.getElementById('calcTime');
    const cEl = document.getElementById('calcCost');
    const savEl = document.getElementById('calcSavings');
    const hrsEl = document.getElementById('calcHours');
    const yrEl = document.getElementById('calcYearly');
    const pbEl = document.getElementById('calcPayback');

    if (!sEl || !tEl || !cEl || !savEl || !hrsEl || !yrEl || !pbEl) {
      warn('Calculator: не все элементы найдены');
      return;
    }

    const scans = Number(sEl.value) || 0;
    const time = Number(tEl.value) || 0;
    const cost = Number(cEl.value) || 0;

    const savedHours = (scans * time * EFFICIENCY) / 60;
    const savedMoney = savedHours * cost;

    savEl.textContent = fmt(savedMoney);
    hrsEl.textContent = Math.round(savedHours) + ' часов врачебного времени';
    yrEl.textContent = fmt(savedMoney * 12);

    if (savedMoney > 0) {
      const months = IMPL_COST / savedMoney;
      pbEl.textContent = months < 1 ? 'менее 1 мес.' : Math.round(months) + ' мес.';
    } else {
      pbEl.textContent = '—';
    }
  }

  ['calcScans', 'calcTime', 'calcCost'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateCalculator);
  });
  updateCalculator();
  log('✓ Calculator ready');

  /* ============================================================
     5) A/B-ТЕСТ ЗАГОЛОВКА
     ============================================================ */
  // Вариант A — контрольный (остаётся как в HTML).
  // Вариант B — тестовый (заменяет H1 и подзаголовок).
  const AB_VARIANT = (() => {
    if (!AB_TEST_ENABLED) return 'A';
    // Сохраняем вариант в localStorage на 30 дней, чтобы пользователь
    // не видел разные заголовки при повторных визитах.
    const KEY = 'neuroscan_ab_variant';
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'A' || saved === 'B') return saved;
    } catch (e) { /* localStorage недоступен */ }
    const v = Math.random() < 0.5 ? 'A' : 'B';
    try { localStorage.setItem(KEY, v); } catch (e) {}
    return v;
  })();

  if (AB_TEST_ENABLED && AB_VARIANT === 'B') {
    const h1 = document.querySelector('.hero h1');
    const sub = document.getElementById('heroSub');
    if (h1) {
      h1.innerHTML = '<strong>Второе мнение</strong> для рентгенолога: находите до 95% скрытых патологий без перегрузки врача';
    }
    if (sub) {
      sub.textContent = 'NeuroScan — зарегистрированная медицинская нейросеть, которая подсвечивает зоны риска и готовит черновик заключения. Врач утверждает решение.';
    }
  }
  log('A/B variant =', AB_VARIANT);

  /* ============================================================
     6) ФОРМА ЗАЯВКИ + ОТПРАВКА В GOOGLE SHEETS
     ============================================================ */
  const form = document.getElementById('leadForm');
  const formWrap = document.getElementById('leadFormWrap');
  const formSuccess = document.getElementById('formSuccess');
  const toast = document.getElementById('toast');

  function showToast(message, isError = false) {
    if (!toast) return;
    toast.textContent = message;
    toast.style.background = isError ? '#FF3B3B' : '#0B1B33';
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function validateForm() {
    let valid = true;

    ['fio', 'phone', 'clinic', 'email'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const empty = !el.value.trim();
      const badEmail = id === 'email' && !/^\S+@\S+\.\S+$/.test(el.value);
      if (empty || badEmail) {
        el.classList.add('error');
        valid = false;
      } else {
        el.classList.remove('error');
      }
    });

    const consent = document.getElementById('consent');
    if (consent && !consent.checked) valid = false;

    return valid;
  }

  function collectPayload() {
    return {
      Name: document.getElementById('fio').value.trim(),
      Phone: document.getElementById('phone').value.trim(),
      Clinic: document.getElementById('clinic').value.trim(),
      Email: document.getElementById('email').value.trim(),
      AB_Variant: AB_VARIANT,
      CreatedAt: new Date().toISOString()
    };
  }

  function sendToGoogleSheets(payload) {
    // Если URL не настроен — работаем в демо-режиме
    if (!GOOGLE_SHEET_WEBAPP_URL || GOOGLE_SHEET_WEBAPP_URL === 'PASTE_YOUR_WEBAPP_URL_HERE') {
      warn('GOOGLE_SHEET_WEBAPP_URL не настроен — форма работает в демо-режиме.');
      warn('Данные заявки:', payload);
      return Promise.resolve({ demo: true });
    }

    const formData = new URLSearchParams();
    Object.keys(payload).forEach((key) => formData.append(key, payload[key]));

    return fetch(GOOGLE_SHEET_WEBAPP_URL, {
      method: 'POST',
      mode: 'no-cors', // важно для Apps Script Web App
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!validateForm()) {
        showToast('Заполните обязательные поля', true);
        return;
      }

      const payload = collectPayload();
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.textContent : '';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправляем…';
      }

      sendToGoogleSheets(payload)
        .then(() => {
          log('Lead sent ✓', payload);
          if (formWrap) formWrap.style.display = 'none';
          if (formSuccess) formSuccess.classList.add('show');
          showToast('✓ Заявка успешно отправлена');
        })
        .catch((err) => {
          console.error('[NeuroScan] Ошибка отправки:', err);
          showToast('Не удалось отправить. Попробуйте ещё раз.', true);
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
          }
        });
    });
    log('✓ Form ready');
  } else {
    warn('Form: не найдена');
  }

  /* ============================================================
     7) ПРОКРУТКА К ФОРМЕ
     ============================================================ */
  function scrollToForm() {
    const target = document.getElementById('leadSection');
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  }

  const headerCta = document.getElementById('headerCta');
  if (headerCta) headerCta.addEventListener('click', scrollToForm);

  document.querySelectorAll('[data-scroll-to-form]').forEach((btn) => {
    btn.addEventListener('click', scrollToForm);
  });

  log('%c NeuroScan ready ✓ Все системы работают', 'background:#0066FF;color:#fff;padding:4px 8px;border-radius:4px;font-weight:bold');

})();