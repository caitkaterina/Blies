"use client";
import { categories } from "@/lib/categories";
import { useState, useRef } from "react";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Upload,
  LockKeyhole,
} from "lucide-react";
import { ui, fields, steps, type Locale } from "@/lib/i18n";
import { services } from "@/lib/content";
export function Quote({
  locale: l,
  initialService,
  initialCategory,
  uploads,
  backendAvailable = true,
}: {
  locale: Locale;
  initialService: string;
  initialCategory?: string;
  uploads: boolean;
  backendAvailable?: boolean;
}) {
  const [step, setStep] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState(0),
    [result, setResult] = useState<{
      reference: string;
      emailStatus: string;
    } | null>(null);
  const [values, setValues] = useState<Record<string, string>>({
    service: services.some((s) => s.id === initialService)
      ? initialService
      : "procurement",
    category: categories.find((c) => c.id === initialCategory)?.title[l] || "",
    quantity: "1",
    unit: "",
    date: "",
    urgency: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const groups = [
    ["service"],
    [
      "originCountry",
      "originCity",
      "collection",
      "destinationCountry",
      "destinationCity",
      "crossBorder",
    ],
    [
      "cargo",
      "category",
      "quantity",
      "unit",
      "weight",
      "dimensions",
      "packaging",
    ],
    [
      ...(values.service === "cold" ? ["temperature"] : []),
      "requirements",
      "dangerous",
    ],
    ["date", "urgency"],
    ["company", "name", "email", "phone", "notes"],
    [],
    [],
  ];
  const required = [
    "service",
    "originCountry",
    "originCity",
    "destinationCountry",
    "destinationCity",
    "cargo",
    "quantity",
    "unit",
    "temperature",
    "urgency",
    "company",
    "name",
    "email",
    "phone",
  ];
  function next() {
    setError("");
    if (form.current?.reportValidity()) {
      setStep((s) => s + 1);
      requestAnimationFrame(() =>
        document.getElementById("quote-heading")?.focus(),
      );
    } else setError(ui.required[l]);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (step < 7) {
      next();
      return;
    }
    if (!consent) {
      setError(ui.required[l]);
      return;
    }
    setBusy(true);
    setError("");
    const body = new FormData();
    const data = {
      ...Object.fromEntries(
        Object.keys(fields)
          .filter((k) => k !== "shipment")
          .map((k) => [k, values[k] || ""]),
      ),
      locale: l,
      consent,
      website: "",
    };
    body.append("data", JSON.stringify(data));
    files.forEach((f) => body.append("files", f));
    const request = new XMLHttpRequest();
    request.open("POST", "/api/quotes");
    request.upload.onprogress = (e) => {
      if (e.lengthComputable)
        setProgress(Math.round((e.loaded / e.total) * 100));
    };
    request.onload = () => {
      setBusy(false);
      let response;
      try {
        response = JSON.parse(request.responseText);
      } catch {
        setError(ui.error[l]);
        return;
      }
      if (request.status === 201) setResult(response);
      else {
        setError(
          request.status === 503
            ? ui.backendUnavailable[l]
            : request.status === 422
              ? ui.required[l]
              : ui.error[l],
        );
        if (response.fields) {
          const bad = response.fields[0];
          const index = groups.findIndex((g) => g.includes(bad));
          if (index >= 0) setStep(index);
        }
      }
    };
    request.onerror = () => {
      setBusy(false);
      setError(ui.error[l]);
    };
    request.send(body);
  }
  if (result)
    return (
      <section className="confirmation" role="status">
        <CheckCircle size={48} />
        <h1>{ui.saved[l]}</h1>
        <p>{ui.reference[l]}</p>
        <strong dir="ltr">{result.reference}</strong>
        <p>
          {result.emailStatus === "sent" ? ui.emailSent[l] : ui.emailPending[l]}
        </p>
        <p>{ui.turnaround[l]}</p>
      </section>
    );
  return (
    <>
      {!backendAvailable && (
        <p className="warning" role="status">
          {ui.backendUnavailable[l]}
        </p>
      )}
      <div className="quote-layout">
        <aside className="quote-sidebar">
          <p className="eyebrow">BLIES / {ui.quote[l]}</p>
          <h2>{ui.quoteIntro[l]}</h2>
          <ol>
            {steps.map((s, i) => (
              <li key={i} aria-current={step === i ? "step" : undefined}>
                <span>{i < step ? "✓" : i + 1}</span>
                {s[l]}
              </li>
            ))}
          </ol>
          <div className="private-note">
            <LockKeyhole size={18} />
            <p>{ui.turnaround[l]}</p>
          </div>
        </aside>
        <form
          noValidate
          ref={form}
          className="quote-form"
          onInvalid={(e) =>
            (e.target as HTMLInputElement).setCustomValidity(ui.required[l])
          }
          onInput={(e) =>
            (e.target as HTMLInputElement).setCustomValidity?.("")
          }
          onSubmit={submit}
        >
          <div className="form-heading">
            <span className="eyebrow">0{step + 1} / 08</span>
            <h1 id="quote-heading" tabIndex={-1}>
              {steps[step][l]}
            </h1>
          </div>
          <div className="form-fields">
            {groups[step].map((key) => (
              <label
                key={key}
                className={
                  ["cargo", "notes", "requirements"].includes(key) ? "full" : ""
                }
              >
                {fields[key as keyof typeof fields][l]}
                {required.includes(key) && <span aria-hidden="true"> *</span>}
                {key === "service" ? (
                  <select
                    required
                    value={values[key]}
                    onChange={(e) =>
                      setValues({ ...values, [key]: e.target.value })
                    }
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title[l]}
                      </option>
                    ))}
                  </select>
                ) : [
                    "cargo",
                    "notes",
                    "requirements",
                    "crossBorder",
                    "dangerous",
                  ].includes(key) ? (
                  <textarea
                    required={required.includes(key)}
                    maxLength={2000}
                    value={values[key] || ""}
                    onChange={(e) =>
                      setValues({ ...values, [key]: e.target.value })
                    }
                  />
                ) : (
                  <input
                    type={
                      key === "email"
                        ? "email"
                        : key === "phone"
                          ? "tel"
                          : key === "date"
                            ? "date"
                            : ["quantity", "weight"].includes(key)
                              ? "number"
                              : "text"
                    }
                    required={required.includes(key)}
                    min={
                      key === "date"
                        ? new Date().toISOString().slice(0, 10)
                        : ["quantity", "weight"].includes(key)
                          ? 0.001
                          : undefined
                    }
                    step={
                      ["quantity", "weight"].includes(key) ? "any" : undefined
                    }
                    maxLength={1000}
                    autoComplete={
                      key === "email"
                        ? "email"
                        : key === "name"
                          ? "name"
                          : key === "phone"
                            ? "tel"
                            : key === "company"
                              ? "organization"
                              : undefined
                    }
                    value={values[key] || ""}
                    onChange={(e) =>
                      setValues({ ...values, [key]: e.target.value })
                    }
                  />
                )}
              </label>
            ))}
          </div>
          {step === 6 && (
            <div className="upload-zone">
              <Upload size={32} />
              <p>{uploads ? ui.fileHelp[l] : ui.noUploads[l]}</p>
              {uploads && (
                <>
                  <label>
                    {ui.upload[l]}
                    <input
                      type="file"
                      multiple
                      accept="application/pdf,image/jpeg,image/png"
                      onChange={(e) => {
                        const selected = Array.from(e.target.files || []);
                        if (
                          selected.length > 3 ||
                          selected.some(
                            (f) =>
                              f.size > 10 * 1024 * 1024 ||
                              ![
                                "application/pdf",
                                "image/jpeg",
                                "image/png",
                              ].includes(f.type),
                          )
                        ) {
                          setError(ui.fileError[l]);
                          e.target.value = "";
                          setFiles([]);
                        } else {
                          setFiles(selected);
                          setError("");
                        }
                      }}
                    />
                  </label>
                  <ul>
                    {files.map((f) => (
                      <li key={f.name}>
                        {f.name} ({(f.size / 1024).toFixed(0)} KB)
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
          {step === 7 && (
            <>
              <div className="review">
                {groups.slice(0, 6).map((group, i) => (
                  <section key={i}>
                    <div>
                      <h2>{steps[i][l]}</h2>
                      <button type="button" onClick={() => setStep(i)}>
                        {ui.edit[l]}
                      </button>
                    </div>
                    <dl>
                      {group
                        .filter((k) => values[k])
                        .map((k) => (
                          <div key={k}>
                            <dt>{fields[k as keyof typeof fields][l]}</dt>
                            <dd
                              dir={
                                ["email", "phone"].includes(k)
                                  ? "ltr"
                                  : undefined
                              }
                            >
                              {k === "service"
                                ? services.find((s) => s.id === values[k])
                                    ?.title[l]
                                : values[k]}
                            </dd>
                          </div>
                        ))}
                    </dl>
                  </section>
                ))}
                <p>
                  {ui.upload[l]}: {files.length}
                </p>
              </div>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  required
                />
                {ui.consent[l]}
              </label>
            </>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {busy && (
            <div role="status">
              <p>
                {ui.loading[l]} {progress}%
              </p>
              <progress value={progress} max={100} />
            </div>
          )}
          <div className="form-actions">
            {step > 0 && (
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  setStep(step - 1);
                  setError("");
                }}
              >
                <ArrowLeft size={18} />
                {ui.back[l]}
              </button>
            )}
            <button className="button" disabled={busy} type="submit">
              {busy ? ui.loading[l] : step === 7 ? ui.submit[l] : ui.next[l]}
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
export function Tracking({
  locale: l,
  backendAvailable = true,
}: {
  locale: Locale;
  backendAvailable?: boolean;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<{
      reference: string;
      emailStatus: string;
    } | null>(null);
  if (result)
    return (
      <div className="confirmation" role="status">
        <CheckCircle size={40} />
        <h2>{ui.saved[l]}</h2>
        <p dir="ltr">{result.reference}</p>
        <p>
          {result.emailStatus === "sent" ? ui.emailSent[l] : ui.emailPending[l]}
        </p>
      </div>
    );
  return (
    <form
      noValidate
      className="tracking-form"
      onInvalid={(e) =>
        (e.target as HTMLInputElement).setCustomValidity(ui.required[l])
      }
      onInput={(e) => (e.target as HTMLInputElement).setCustomValidity?.("")}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!e.currentTarget.reportValidity()) {
          setError(ui.required[l]);
          return;
        }
        setBusy(true);
        setError("");
        const form = new FormData(e.currentTarget);
        const data = {
          ...Object.fromEntries(form),
          locale: l,
          consent: form.get("consent") === "on",
          website: "",
        };
        try {
          const r = await fetch("/api/tracking", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          if (r.status === 503) {
            setError(ui.backendUnavailable[l]);
            return;
          }
          if (!r.ok) throw Error();
          setResult(await r.json());
        } catch {
          setError(ui.error[l]);
        } finally {
          setBusy(false);
        }
      }}
    >
      {!backendAvailable && (
        <p className="warning" role="status">
          {ui.backendUnavailable[l]}
        </p>
      )}
      <div className="form-fields">
        {(
          ["shipment", "company", "name", "email", "phone", "notes"] as const
        ).map((k) => (
          <label key={k}>
            {fields[k][l]}
            {k === "notes" ? (
              <textarea name={k} maxLength={2000} />
            ) : (
              <input
                name={k}
                type={k === "email" ? "email" : k === "phone" ? "tel" : "text"}
                maxLength={1000}
                required
              />
            )}
          </label>
        ))}
      </div>
      <label className="checkbox">
        <input type="checkbox" required name="consent" />
        {ui.consent[l]}
      </label>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button disabled={busy} className="button">
        {busy ? ui.loading[l] : ui.submit[l]}
      </button>
    </form>
  );
}
