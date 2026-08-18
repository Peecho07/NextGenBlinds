(function () {
  var form = document.getElementById('leadForm');
  if (!form) return;
  var success = document.getElementById('leadSuccess');
  var errBox  = document.getElementById('leadError');
  var btn     = form.querySelector('.form-submit');
  var btnText = btn.textContent;

  function fail(msg) {
    errBox.textContent = msg;
    errBox.style.display = 'block';
    btn.removeAttribute('aria-busy');
    btn.textContent = btnText;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errBox.style.display = 'none';
    btn.setAttribute('aria-busy', 'true');
    btn.textContent = 'Sending…';

    fetch(form.action, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new FormData(form)
    })
    .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
    .then(function (res) {
      if (!res.ok || res.data.success === false) {
        return fail('That didn’t go through. Please call 561-332-8091 and we’ll book you right away.');
      }
      form.style.display = 'none';
      success.style.display = 'block';
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    })
    .catch(function () {
      fail('That didn’t go through. Please call 561-332-8091 and we’ll book you right away.');
    });
  });

  var mnav = document.getElementById('mnav');
  if (mnav) {
    mnav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') mnav.classList.remove('open');
    });
  }
})();
