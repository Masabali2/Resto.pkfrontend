export interface VerifyEmailOtpRequest {
  email: string;
  otp: string;
}

export interface SendEmailVerificationOtpRequest {
  email: string;
}

export interface VerifyEmailRequest {
  email: string;
  token: string;
}
