(function () {
  'use strict';

  window.PacDraw = window.PacDraw || {};

  const PublicConfig = window.PacDrawPublic && PacDrawPublic.Config;
  const State = PacDraw.State;
  const Config = PacDraw.Config;
  let publishing = false;

  function endpoint(path) {
    return String(PublicConfig.SUPABASE_URL || '').replace(/\/$/, '') + path;
  }

  function getPublishToken(interactive) {
    const key = PublicConfig.PUBLISH_TOKEN_SESSION_KEY;
    let token = '';
    try { token = sessionStorage.getItem(key) || ''; } catch (error) {}
    if (token || !interactive) return token;

    token = window.prompt(
      'أدخل رمز نشر القرعة على صفحة الجمهور.\n\n' +
      'الرمز خاص بالمنظم فقط ويُحفظ في هذا التبويب حتى تغلق المتصفح.'
    ) || '';

    token = token.trim();
    if (token) {
      try { sessionStorage.setItem(key, token); } catch (error) {}
    }
    return token;
  }

  function clearPublishToken() {
    try { sessionStorage.removeItem(PublicConfig.PUBLISH_TOKEN_SESSION_KEY); } catch (error) {}
  }

  function payloadFromState(state) {
    const sport = Config.SPORTS[state.selectedSport];
    if (!sport) return null;

    return {
      p_token: '',
      p_sport: state.selectedSport,
      p_matches: state.matches.map((match, index) => ({
        number: Number(match.number) || index + 1,
        a: String(match.aName || match.a || ''),
        b: String(match.bName || match.b || '')
      }))
    };
  }

  async function publishCompletedDraw(state, options) {
    options = options || {};
    state = state || State.get();

    if (!PublicConfig || !PublicConfig.SUPABASE_URL || !PublicConfig.SUPABASE_PUBLISHABLE_KEY) {
      return { ok: false, reason: 'missing_public_config' };
    }

    if (!state || state.phase !== 'complete' || !state.selectedSport || !Array.isArray(state.matches) || !state.matches.length) {
      window.alert('لا يمكن النشر قبل اكتمال القرعة بالكامل.');
      return { ok: false, reason: 'draw_not_complete' };
    }

    if (publishing) return { ok: false, reason: 'already_publishing' };

    const token = getPublishToken(options.interactive !== false);
    if (!token) return { ok: false, reason: 'publish_token_missing' };

    const payload = payloadFromState(state);
    payload.p_token = token;
    publishing = true;

    window.dispatchEvent(new CustomEvent('pacdraw:publishstatus', {
      detail: { status: 'publishing', sport: state.selectedSport }
    }));

    try {
      const response = await fetch(
        endpoint('/rest/v1/rpc/' + encodeURIComponent(PublicConfig.PUBLISH_RPC)),
        {
          method: 'POST',
          headers: {
            'apikey': PublicConfig.SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload),
          cache: 'no-store'
        }
      );

      const raw = await response.text();
      let result = null;
      try { result = raw ? JSON.parse(raw) : null; } catch (error) { result = raw; }

      if (!response.ok) {
        const message = result && (result.message || result.details || result.hint)
          ? [result.message, result.details, result.hint].filter(Boolean).join(' — ')
          : ('HTTP ' + response.status);

        if (response.status === 401 || response.status === 403 || /token/i.test(String(message))) {
          clearPublishToken();
        }
        throw new Error(message);
      }

      const publishedAt = new Date().toISOString();
      State.update((draft) => {
        draft.publicPublishedSessionId = draft.sessionId;
        draft.publicPublishedAt = publishedAt;
        if (State.audit) {
          State.audit(draft, 'public_results_published', {
            sport: draft.selectedSport,
            sessionId: draft.sessionId,
            publishedAt
          });
        }
      });

      window.dispatchEvent(new CustomEvent('pacdraw:publishstatus', {
        detail: { status: 'published', sport: state.selectedSport, publishedAt }
      }));

      if (options.interactive !== false) {
        window.alert(
          'تم نشر القرعة بنجاح ✓\n\n' +
          'يمكن للجمهور الآن فتح:\n' +
          window.location.origin + '/draw/results.html?sport=' + encodeURIComponent(state.selectedSport)
        );
      }

      return { ok: true, publishedAt, result };
    } catch (error) {
      console.error('PAC-DRAW public publishing failed:', error);

      window.dispatchEvent(new CustomEvent('pacdraw:publishstatus', {
        detail: { status: 'error', sport: state.selectedSport, error: error.message || String(error) }
      }));

      if (options.interactive !== false) {
        window.alert(
          'فشل نشر القرعة على صفحة الجمهور.\n\n' +
          'القرعة نفسها ما زالت محفوظة.\n\n' +
          'الخطأ:\n' + (error.message || error) + '\n\n' +
          'بعد إصلاح Supabase اضغط PUBLISH TO WEBSITE مرة ثانية.'
        );
      }
      return { ok: false, reason: 'request_failed', error };
    } finally {
      publishing = false;
    }
  }

  PacDraw.Publish = {
    publishCompletedDraw,
    clearPublishToken,
    isPublishing: () => publishing
  };
})();
