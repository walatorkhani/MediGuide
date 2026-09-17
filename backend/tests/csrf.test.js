const { issueCsrfToken, csrfProtection } = require("../middleware/csrf");

function mockResponse() {
  return {
    cookie: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("CSRF middleware", () => {
  test("issueCsrfToken crée un cookie si absent", () => {
    const req = { cookies: {} };
    const res = mockResponse();
    const next = jest.fn();

    issueCsrfToken(req, res, next);

    expect(res.cookie).toHaveBeenCalledWith(
      "csrf_token",
      expect.any(String),
      expect.objectContaining({ httpOnly: false })
    );
    expect(next).toHaveBeenCalled();
  });

  test("issueCsrfToken réutilise le cookie existant", () => {
    const req = { cookies: { csrf_token: "abc" } };
    const res = mockResponse();
    const next = jest.fn();

    issueCsrfToken(req, res, next);

    expect(res.cookie).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  test("autorise une méthode GET sans CSRF", () => {
    const next = jest.fn();
    csrfProtection({ method: "GET" }, mockResponse(), next);
    expect(next).toHaveBeenCalled();
  });

  test("bloque un token absent", () => {
    const res = mockResponse();
    csrfProtection(
      { method: "POST", cookies: {}, get: jest.fn() },
      res,
      jest.fn()
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("autorise un token identique cookie/header", () => {
    const next = jest.fn();
    csrfProtection(
      {
        method: "POST",
        cookies: { csrf_token: "abc123" },
        get: () => "abc123",
      },
      mockResponse(),
      next
    );
    expect(next).toHaveBeenCalled();
  });
});
