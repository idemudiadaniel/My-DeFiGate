export const respondError = (res, status, message, retryable = false, details = null) => {
  const payload = { ok: false, error: message, retryable };
  if (details) payload.details = details;
  return res.status(status).json(payload);
};

export const respondSuccess = (res, data = {}, message = null) => {
  const payload = { ok: true, data };
  if (message) payload.message = message;
  return res.json(payload);
};