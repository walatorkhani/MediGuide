import { spawnSync } from "node:child_process";
import path from "node:path";

export default async function globalSetup() {
  const backendDir = path.resolve(process.cwd(), "../backend");
  const stateFile = path.resolve(process.cwd(), "e2e/.e2e-state.json");
  const scriptPath = path.resolve(backendDir, "scripts/prepareE2E.js");

  // On invoque directement le binaire Node sur le script, plutôt que de
  // spawn "npm"/"npm.cmd" : depuis le correctif Node.js CVE-2024-27980,
  // spawnSync refuse d'exécuter un .cmd/.bat sans shell:true, ce qui fait
  // échouer silencieusement "npm run e2e:prepare" sur Windows.
  const result = spawnSync(
    process.execPath,
    [scriptPath],
    {
      cwd: backendDir,
      env: { ...process.env, E2E_STATE_FILE: stateFile },
      stdio: "inherit",
    }
  );

  if (result.error) {
    throw new Error(
      `Impossible de lancer la préparation E2E (${result.error.message}). Vérifiez que Node.js est installé et que ${scriptPath} existe.`
    );
  }

  if (result.status !== 0) {
    throw new Error(
      "La préparation E2E a échoué. Vérifiez PostgreSQL, les migrations et les données médecins."
    );
  }
}
