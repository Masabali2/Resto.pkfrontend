
import type { ValidationError } from './api-response.model';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorCode: string,
    message: string,
    public readonly errors: ValidationError[] = [],
    public readonly traceId: string | null = null
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
