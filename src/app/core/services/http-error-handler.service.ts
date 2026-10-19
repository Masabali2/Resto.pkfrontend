
import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

export interface HttpErrorHandlerOptions {
  unauthorizedMessage?: string;
  fallbackMessage?: string;
  fieldAliases?: Record<string, string>;
}

export interface HttpErrorDetails {
  message: string;
  fieldErrors: Record<string, string>;
}

interface ApiErrorBody {
  message?: string | null;
  errors?: { field: string; message: string }[] | null;
}

@Injectable({
  providedIn: 'root'
})
export class HttpErrorHandlerService {
  handle(
    error: unknown,
    options: HttpErrorHandlerOptions = {}
  ): HttpErrorDetails {
    const fieldErrors: Record<string, string> = {};

    if (!(error instanceof HttpErrorResponse)) {
      return {
        message: 'An unexpected error occurred. Please try again.',
        fieldErrors
      };
    }

    if (error.status === 0) {
      return {
        message: 'Unable to connect to the server. Please check your connection.',
        fieldErrors
      };
    }

    if (error.status >= 500) {
      return {
        message: 'A server error occurred. Please try again later.',
        fieldErrors
      };
    }

    if (error.status === 401 && options.unauthorizedMessage) {
      return {
        message: options.unauthorizedMessage,
        fieldErrors
      };
    }

    const body = error.error as ApiErrorBody | null;

    for (const item of body?.errors ?? []) {
      const key = this.normalizeFieldKey(item.field);
      const field = options.fieldAliases?.[key] ?? key;

      if (field && !fieldErrors[field]) {
        fieldErrors[field] = item.message;
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      return {
        message: '',
        fieldErrors
      };
    }

    return {
      message:
        body?.message ??
        options.fallbackMessage ??
        'Something went wrong. Please try again.',
      fieldErrors
    };
  }

  /**
   * Extracts the meaningful backend message from a failed HTTP response
   * without displaying it. Returns null when the backend provided no
   * usable message so callers can apply their own fallback.
   */
  extractBackendMessage(error: unknown): string | null {
    if (!(error instanceof HttpErrorResponse)) {
      return null;
    }

    const body = error.error as ApiErrorBody | null;
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    return message.length > 0 ? message : null;
  }

  private normalizeFieldKey(key: string): string {
    return key
      .replace(/([a-z0-9])([A-Z])/g, '$1$2')
      .replace(/[\s_-]/g, '')
      .toLowerCase();
  }
}
