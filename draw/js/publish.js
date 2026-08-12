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
      'أدخل رمز نشر نتائج القرعة للموقع.\n\n' +
      'هذا الرمز مطلوب للمنظم فقط، وسيبقى محفوظًا في هذا التبويب حتى تغلق المتصفح.'
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
      p_token: null,
      p_sport: state.selectedSport,
      p_sport_name: sport.name,
      p_round: sport.round,
      p_session_id: state.sessionId || '',
      p_matches: state.matches.map((match) => ({
        number: match.number,
        a: match.aName,
        b: match.bName
      })),
      p_completed_at: state.completedAt || new Date().toISOString()
    };
  }

  async function publishCompletedDraw(state, options) {
    options = options || {};
    state = state || State.get();

    if (!PublicConfig || !PublicConfig.SUPABASE_URL || !PublicConfig.SUPABASE_PUBLISHABLE_KEY) {
      return { ok: false, reason: 'missing_public_config' };
    }
    if (!state || state.phase !== 'complete' || !state.selectedSport || !state.matches.length) {
      return { ok: false, reason: 'draw_not_complete' };
    }
    if (!options.force && state.publicPublishedSessionId === state.sessionId) {
      return { ok: true, alreadyPublished: true };
    }
    if (publishing) return { ok: false, reason: 'already_publishing' };

    const token = getPublishToken(options.interactive !== false);
    if (!token) return { ok: false, reason: 'publish_token_missing' };

    const payload = payloadFromState(state);
    payload.p_token = token;
    publishing = true;

    try {
      const response = await fetch(endpoint('/rest/v1/rpc/' + encodeURIComponent(PublicConfig.PUBLISH_RPC)), {
        method: 'POST',
        headers: {
          'apikey': PublicConfig.SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const text = await response.text();
      let result = null;
      try { result = text ? JSON.parse(text) : null; } catch (error) { result = text; }

      if (!response.ok) {
        const message = result && (result.message || result.hint || result.details)
          ? (result.message || result.hint || result.details)
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
        State.audit(draft, 'public_results_published', {
          sport: draft.selectedSport,
          sessionId: draft.sessionId,
          publishedAt
        });
      });

      window.dispatchEvent(new CustomEvent('pacdraw:published', {
        detail: { ok: true, sport: state.selectedSport, publishedAt }
      }));
      return { ok: true, publishedAt, result };
    } catch (error) {
      console.error('PAC-DRAW: public results publish failed.', error);
      window.dispatchEvent(new CustomEvent('pacdraw:published', {
        detail: { ok: false, sport: state.selectedSport, error: error.message || String(error) }
      }));
      if (options.interactive !== false) {
        window.alert(
          'لم يتم نشر نتيجة القرعة على صفحة الجمهور.\n\n' +
          'القرعة محفوظة محليًا ولم تتغير.\n' +
          'السبب: ' + (error.message || error) + '\n\n' +
          'بعد حل المشكلة اضغط PUBLISH TO WEBSITE من شاشة النتائج.'
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
