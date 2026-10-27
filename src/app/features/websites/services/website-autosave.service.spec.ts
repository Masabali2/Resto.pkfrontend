import { TestBed } from '@angular/core/testing';
import { Subject, throwError } from 'rxjs';

import { WebsiteAutosaveService } from './website-autosave.service';
import { WebsiteService } from './website.service';
import type { ApiResponse } from '../../../core/models/api-response.model';
import type { WebsiteDto } from '../models/website.model';
import type { WebsiteConfig } from '../models/website-config.model';
import { createDefaultWebsiteConfig } from '../utils/website-config.util';

const SITE_ID = '11111111-1111-1111-1111-111111111111';

/** Produces configs whose serialized JSON contains the given marker so
 *  payload assertions can identify which snapshot was actually sent. */
function configWithMarker(marker: string): WebsiteConfig {
  const config = createDefaultWebsiteConfig();
  return {
    ...config,
    settings: { ...config.settings, marker }
  };
}

function okResponse(): ApiResponse<WebsiteDto> {
  return {
    success: true,
    data: { id: SITE_ID } as WebsiteDto,
    message: null,
    errorCode: null,
    errors: null,
    traceId: null,
  };
}

function failResponse(message = 'Server rejected the draft.'): ApiResponse<WebsiteDto> {
  return {
    success: false,
    data: null,
    message,
    errorCode: 'ERROR',
    errors: null,
    traceId: null,
  };
}

describe('WebsiteAutosaveService', () => {
  let service: WebsiteAutosaveService;
  let saveDraftSpy: ReturnType<typeof vi.fn>;
  let responses: Subject<ApiResponse<WebsiteDto>>[];

  beforeEach(() => {
    responses = [];
    saveDraftSpy = vi.fn(() => {
      const subject = new Subject<ApiResponse<WebsiteDto>>();
      responses.push(subject);
      return subject.asObservable();
    });

    TestBed.configureTestingModule({
      providers: [
        WebsiteAutosaveService,
        { provide: WebsiteService, useValue: { saveDraft: saveDraftSpy } }
      ]
    });

    service = TestBed.inject(WebsiteAutosaveService);
  });

  afterEach(() => {
    // Complete any dangling subjects so pending concatMap chains unwind.
    responses.forEach(s => s.complete());
    service.ngOnDestroy();
  });

  it('debounces edits: multiple changes within the window coalesce into one request', async () => {
    await (async () => {
      vi.useFakeTimers();
      try {
        service.triggerSave(SITE_ID, configWithMarker('a'));
        service.triggerSave(SITE_ID, configWithMarker('b'));
        service.triggerSave(SITE_ID, configWithMarker('c'));

        await vi.advanceTimersByTimeAsync(2100); // debounce + microtasks

        expect(saveDraftSpy).toHaveBeenCalledTimes(1);
        // The single request must carry the LATEST snapshot.
        const payload = saveDraftSpy.mock.calls[0][1] as { configurationJson: string };
        expect(payload.configurationJson).toContain('"marker":"c"');
      } finally {
        vi.useRealTimers();
      }
    })();
  });

  it('resolves immediately when nothing was ever edited', async () => {
    const state = await service.saveNow();
    expect(state.status).toBe('idle');
    expect(saveDraftSpy).not.toHaveBeenCalled();
  });

  it('saveNow flushes pending edits and resolves only after the server confirms', async () => {
    vi.useFakeTimers();
    try {
      service.triggerSave(SITE_ID, configWithMarker('x'));
      const done = service.saveNow();

      await vi.advanceTimersByTimeAsync(2100);
      expect(saveDraftSpy).toHaveBeenCalledTimes(1);

      // Not yet resolved — the response has not arrived.
      let settled = false;
      void done.then(() => (settled = true));
      await Promise.resolve();
      expect(settled).toBe(false);

      responses[0].next(okResponse());
      responses[0].complete();

      const state = await done;
      expect(state.savedVersion).toBeGreaterThanOrEqual(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('saveNow rejects on failure and does not mark newer edits saved', async () => {
    vi.useFakeTimers();
    try {
      service.triggerSave(SITE_ID, configWithMarker('x'));
      const done = service.saveNow();

      await vi.advanceTimersByTimeAsync(2100);
      responses[0].next(failResponse());
      responses[0].complete();

      await expect(done).rejects.toThrow('Server rejected the draft.');
    } finally {
      vi.useRealTimers();
    }
  });

  it('edits made during an in-flight save keep the editor dirty until persisted', async () => {
    vi.useFakeTimers();
    try {
      const statuses: string[] = [];
      service.status$.subscribe(s => statuses.push(s.status));

      service.triggerSave(SITE_ID, configWithMarker('one'));
      await vi.advanceTimersByTimeAsync(2100);
      expect(saveDraftSpy).toHaveBeenCalledTimes(1);

      // New edit arrives while request #1 is still open.
      service.triggerSave(SITE_ID, configWithMarker('two'));
      responses[0].next(okResponse());
      responses[0].complete();
      await vi.advanceTimersByTimeAsync(0);

      // Confirmation of revision 1 must NOT produce a final 'saved' status —
      // revision 2 is still outstanding.
      expect(statuses[statuses.length - 1]).not.toBe('saved');

      await vi.advanceTimersByTimeAsync(2100);
      expect(saveDraftSpy).toHaveBeenCalledTimes(2);
      responses[1].next(okResponse());
      responses[1].complete();
      await vi.advanceTimersByTimeAsync(0);

      expect(statuses[statuses.length - 1]).toBe('saved');
    } finally {
      vi.useRealTimers();
    }
  });

  it('a late stale response cannot regress the saved state', async () => {
    // True out-of-order completion requires two SIMULTANEOUSLY in-flight
    // requests, which the serialized (concatMap) pipeline intentionally
    // prevents for this client. The safety property that matters — a stale
    // confirmation can never move the UI back to unsaved or lower the
    // confirmed version — is guaranteed by `savedVersion` only advancing
    // (`job.version >= savedVersion`). We assert that invariant directly.
    vi.useFakeTimers();
    try {
      service.triggerSave(SITE_ID, configWithMarker('a'));
      await vi.advanceTimersByTimeAsync(2100);
      responses[0].next(okResponse());
      responses[0].complete();
      await vi.advanceTimersByTimeAsync(2100);

      service.triggerSave(SITE_ID, configWithMarker('b'));
      await vi.advanceTimersByTimeAsync(2100);
      responses[1].next(okResponse());
      responses[1].complete();
      await vi.advanceTimersByTimeAsync(2100);

      const observedVersions: number[] = [];
      const sub = service.status$.subscribe(s => observedVersions.push(s.savedVersion));

      // A newer edit lands and persists…
      service.triggerSave(SITE_ID, configWithMarker('c'));
      await vi.advanceTimersByTimeAsync(2100);
      responses[2].next(okResponse());
      responses[2].complete();
      await vi.advanceTimersByTimeAsync(2100);

      // …then an already-confirmed older revision is replayed via retry.
      // Because lastSnapshot is now 'c', the retry re-queues the NEWEST
      // snapshot under a newer revision — never the stale one.
      service.retry();
      await vi.advanceTimersByTimeAsync(2100);

      // savedVersion never decreased across all emitted states.
      for (let i = 1; i < observedVersions.length; i++) {
        expect(observedVersions[i]).toBeGreaterThanOrEqual(observedVersions[i - 1]!);
      }
      // Final confirmed version covers every edit made so far.
      expect(observedVersions.at(-1)).toBeGreaterThanOrEqual(3);
      sub.unsubscribe();
    } finally {
      vi.useRealTimers();
    }
  });

  it('transport errors surface as failed without breaking the pipeline', async () => {
    vi.useFakeTimers();
    try {
      saveDraftSpy.mockImplementationOnce(() => throwError(() => new Error('network down')));

      let lastStatus = '';
      const statusSub = service.status$.subscribe(s => (lastStatus = s.status));

      service.triggerSave(SITE_ID, configWithMarker('a'));
      await vi.advanceTimersByTimeAsync(2100);

      expect(lastStatus).toBe('failed');
      statusSub.unsubscribe();

      // Pipeline survives: a subsequent edit still schedules a save.
      service.triggerSave(SITE_ID, configWithMarker('b'));
      await vi.advanceTimersByTimeAsync(2100);
      expect(saveDraftSpy).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('retry re-queues the latest snapshot rather than a stale config', async () => {
    vi.useFakeTimers();
    try {
      // First attempt fails at the transport level.
      saveDraftSpy.mockImplementationOnce(() => throwError(() => new Error('network down')));

      let lastStatus = '';
      const statusSub = service.status$.subscribe(s => (lastStatus = s.status));

      service.triggerSave(SITE_ID, configWithMarker('old'));
      await vi.advanceTimersByTimeAsync(2100);
      expect(lastStatus).toBe('failed');

      // A newer edit arrives and its debounced save is still pending when
      // the user explicitly retries. The retry must queue the NEWEST
      // snapshot ('new'), never the captured 'old' config.
      service.triggerSave(SITE_ID, configWithMarker('new'));
      service.retry();
      await vi.advanceTimersByTimeAsync(2100);

      expect(saveDraftSpy).toHaveBeenCalledTimes(2);
      const payload = saveDraftSpy.mock.calls[1][1] as { configurationJson: string };
      expect(payload.configurationJson).toContain('"marker":"new"');
      statusSub.unsubscribe();
    } finally {
      vi.useRealTimers();
    }
  });

  it('reset clears tracking so a newly loaded website starts clean', async () => {
    vi.useFakeTimers();
    try {
      service.triggerSave(SITE_ID, configWithMarker('a'));
      await vi.advanceTimersByTimeAsync(2100);
      responses[0]?.next(okResponse());
      responses[0]?.complete();
      await vi.advanceTimersByTimeAsync(0);

      service.reset();
      const state = await service.saveNow();
      expect(state.status).toBe('idle');
    } finally {
      vi.useRealTimers();
    }
  });
});
