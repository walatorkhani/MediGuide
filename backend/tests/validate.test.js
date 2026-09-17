const { validate, z } = require("../middleware/validate");

describe("validate middleware", () => {
  const schema = z.object({ nom: z.string().min(2) });

  test("rejette les données invalides avec 400", () => {
    const req = { body: { nom: "A" } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    validate(schema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Données invalides." })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("transforme et transmet les données valides", () => {
    const schemaWithTransform = z.object({
      email: z.string().trim().toLowerCase(),
    });
    const req = { body: { email: " TEST@EXAMPLE.COM " } };
    const res = {};
    const next = jest.fn();

    validate(schemaWithTransform)(req, res, next);

    expect(req.body.email).toBe("test@example.com");
    expect(next).toHaveBeenCalled();
  });
});
