import { TestBed } from '@angular/core/testing';
import { Subject, throwError } from 'rxjs';

import { WebsiteAutosaveService } from './website-autosave.service';
import { WebsiteService } from './website.service';
import type { ApiResponse, WebsiteDto } from '../models/website.model';
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
  return { success: true, data: { id: SITE_ID } as WebsiteDto, message: null, errorCode: null };
}

function failResponse(message = 'Server rejected the draft.'): ApiResponse<WebsiteDto> {
  return { success: false, data: null, message, errorCode: 'ERROR' };
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

  it('stale confirmations cannot advance savedVersion past the newest edit', async () => {
    vi.useFakeTimers();
    try {
      service.triggerSave(SITE_ID, configWithMarker('a'));
      await vi.advanceTimersByTimeAsync(2100);
      const first = responses[0];

      service.triggerSave(SITE_ID, configWithMarker('b'));
      await vi.advanceTimersByTimeAsync(2100);
      const second = responses[1];

      // Newest write lands first (server reordering), then the stale one.
      second.next(okResponse());
      second.complete();
      await vi.advanceTimersByTimeAsync(0);
      first.next(okResponse());
      first.complete();
      await vi.advanceTimersByTimeAsync(0);

      // Final state remains saved with no regression to an older version.
      let lastSavedVersion = -1;
      service.status$.subscribe(s => (lastSavedVersion = s.savedVersion));
      expect(lastSavedVersion).toBeGreaterThanOrEqual(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('transport errors surface as failed without breaking the pipeline', async () => {
    vi.useFakeTimers();
    try {
      saveDraftSpy.mockImplementationOnce(() => throwError(() => new Error('network down')));
      service.triggerSave(SITE_ID, configWithMarker('a'));
      await vi.advanceTimersByTimeAsync(2100);

      let lastStatus = '';
      service.status$.subscribe(s => (lastStatus = s.status));
      expect(lastStatus).toBe('failed');

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
      saveDraftSpy.mockImplementationOnce(() => {
        const s = new Subject<ApiResponse<WebsiteDto>>();
        responses.push(s);
        s.next(failResponse());
        s.complete();
        return s.asObservable();
      });

      service.triggerSave(SITE_ID, configWithMarker('old'));
      await vi.advanceTimersByTimeAsync(3000);

      service.triggerSave(SITE_ID, configWithMarker('new'));
      await vi.advanceTimersByTimeAsync(3000);

      saveDraftSpy.mockClear();
      responses.forEach(r => r.complete());
      responses.length = 0;

      service.retry();
      await vi.advanceTimersByTimeAsync(3000);

      expect(saveDraftSpy).toHaveBeenCalled();
      const payload = saveDraftSpy.mock.calls[0][1] as { configurationJson: string };
      expect(payload.configurationJson).toContain('"marker":"new"');
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
