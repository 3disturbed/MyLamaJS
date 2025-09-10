import axios from "axios";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class MyLamaJS {
  /**
   * Constructor politely reads configuration and prepares a tiny HTTP envoy.
   * @param {object} options
   * @param {string} [options.configPath] - Optional secret map to the config file (defaults beside this module).
   * @param {object} [options.override]   - Last‑minute wardrobe changes for config keys.
   */
  constructor({ configPath, override = {} } = {}) {
    const cfgPath = configPath ?? path.join(__dirname, "mylamajs.config.json");
    const raw = fs.readFileSync(cfgPath, "utf8");
    const loaded = JSON.parse(raw);

    this.config = {
      baseURL: loaded.baseURL,
      timeoutMs: loaded.timeoutMs ?? 60000,
      defaultHeaders: loaded.defaultHeaders ?? { "Content-Type": "application/json" },
      endpoint: loaded.endpoint ?? "/api/generate",
      ...override,
    };

    this.http = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeoutMs,
      headers: this.config.defaultHeaders,
      // We refrain from declaring responseType here; each request may have its own eccentricities.
      validateStatus: (s) => s >= 200 && s < 300,
    });
  }

  /**
   * Politely requests prose (or babble) from the designated model.
   * Sends a parcel shaped like: { model, prompt, stream, num_predict } to the configured endpoint.
   * @param {string} modelId - Name/identifier of the verbose oracle.
   * @param {string} prompt - Your opening soliloquy.
   * @param {number} [responseLength=256] - Approximate token allowance (maps to num_predict).
   * @param {boolean} [stream=false] - If true, yields morsels; else returns the whole confection at once.
   * @returns {Promise<string>|AsyncGenerator<string>}
   */
  getResponse(modelId, prompt, responseLength = 256, stream = false) {
    if (!modelId || !prompt?.length) {
      throw new Error("modelId and prompt are required.");
    }

    const body = {
      model: modelId,
      prompt,
      stream,
      num_predict: responseLength,
    };

  if (!stream) {
    // Non‑streaming: await the entire literary loaf.
      return this.http
        .post(this.config.endpoint, body, { responseType: "json" })
        .then((res) => {
      // Typical servers return a solitary JSON object bearing a 'response' field.
          if (typeof res.data?.response === "string") {
            return res.data.response;
          }
      // If the server styled it differently, we take a tasteful guess.
          if (typeof res.data === "string") return res.data;
          throw new Error("Unexpected response format in non-streaming mode.");
        })
        .catch((err) => {
          throw normalizeAxiosError(err);
        });
    }

  // Streaming: produce an async generator serving tidy textual crumbs.
    const self = this;
    return (async function* streamGenerator() {
      let res;
      try {
        res = await self.http.post(self.config.endpoint, body, {
          responseType: "stream",
        });
      } catch (err) {
        throw normalizeAxiosError(err);
      }

      const stream = res.data;
      let leftover = "";

      for await (const chunk of stream) {
    // Expecting line‑delimited JSON: {"response":"text","done":false,...}\n
        leftover += chunk.toString("utf8");
        let idx;
        while ((idx = leftover.indexOf("\n")) >= 0) {
          const line = leftover.slice(0, idx).trim();
          leftover = leftover.slice(idx + 1);
          if (!line) continue;
          try {
            const obj = JSON.parse(line);
            if (obj?.response) {
              yield obj.response;
            }
            if (obj?.done) {
              return;
            }
          } catch {
      // If the fragment is prematurely shaped, we wait for reinforcements.
          }
        }
      }

    // Final attempt at deciphering any trailing enigmatic residue.
      const final = leftover.trim();
      if (final) {
        try {
          const obj = JSON.parse(final);
          if (obj?.response) yield obj.response;
        } catch {
      // Quietly abandon the orphaned fragment.
        }
      }
    })();
  }
}
/** Converts axios grumbles into polite, comprehensible complaints. */
function normalizeAxiosError(err) {
  if (err?.response) {
    const status = err.response.status;
    const data = truncate(JSON.stringify(err.response.data ?? ""), 512);
    return new Error(`HTTP ${status}: ${data}`);
  }
  if (err?.request) {
    return new Error("No response received from server.");
  }
  return new Error(err?.message ?? "Unknown error.");
}

function truncate(s, n) {
  return s.length <= n ? s : s.slice(0, n) + "…";
}
