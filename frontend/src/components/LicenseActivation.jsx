import { useState } from "react";
import { activateLicense } from "../services/api";

function LicenseActivation({ onActivated }) {
  const [licenseKey, setLicenseKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const key = licenseKey.trim();

    if (!key) {
      setSuccess(false);
      setMessage("Veuillez saisir votre clé de licence.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await activateLicense(key);

      if (response.data?.success) {
        setSuccess(true);

        setMessage(
          "Licence MediGuide activée avec succès."
        );

        localStorage.setItem(
          "mediguide_license_key",
          key
        );

        localStorage.setItem(
          "mediguide_license_activated",
          "true"
        );

        if (onActivated) {
          onActivated(response.data);
        }
      }
    } catch (error) {
      setSuccess(false);

      setMessage(
        error.response?.data?.message ||
        "Erreur lors de l'activation de la licence."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="license-page">
      <div className="license-card">

        <h1>Activation de MediGuide</h1>

        <p>
          Veuillez saisir votre clé de licence pour
          utiliser l'application MediGuide.
        </p>

        <form onSubmit={handleSubmit}>

          <label htmlFor="licenseKey">
            Clé de licence
          </label>

          <input
            id="licenseKey"
            type="text"
            value={licenseKey}
            onChange={(event) =>
              setLicenseKey(event.target.value)
            }
            placeholder="MEDIGUIDE-XXXXXXXX-XXXXXXXX-XXXXXXXX..."
            autoComplete="off"
            disabled={loading || success}
          />

          <button
            type="submit"
            disabled={loading || success}
          >
            {loading
              ? "Activation en cours..."
              : success
              ? "Licence activée"
              : "Activer la licence"}
          </button>

        </form>

        {message && (
          <div
            className={
              success
                ? "license-message success"
                : "license-message error"
            }
            role="alert"
          >
            {message}
          </div>
        )}

        <div className="license-info">
          <strong>MediGuide</strong>
          <span>Licence propriétaire</span>
        </div>

      </div>
    </div>
  );
}

export default LicenseActivation;