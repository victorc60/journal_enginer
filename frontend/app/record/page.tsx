"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

type FailurePreview = {
  equipment_name: string | null;
  problem: string | null;
  cause: string | null;
  solution: string | null;
  downtime_minutes: number | null;
  severity: string | null;
};

type MaintenanceEventPreview = {
  equipment_name: string | null;
  action: string | null;
  parts_used: string | null;
  notes: string | null;
};

type ParsedShiftPreview = {
  shift_date: string;
  heads_count: number | null;
  work_hours: number | null;
  co2_start_kg: number | null;
  co2_end_kg: number | null;
  co2_used_kg: number | null;
  co2_per_head_g: number | null;
  outside_temp_c: number | null;
  chiller_temp_c: number | null;
  meat_temp_c: number | null;
  notes: string | null;
  failures: FailurePreview[];
  maintenance_events: MaintenanceEventPreview[];
};

type PreviewResponse = {
  raw_text: string;
  parsed: ParsedShiftPreview;
};

type ShiftResponse = {
  id: number;
  shift_date: string;
  heads_count: number | null;
  co2_used_kg: string | number | null;
  co2_per_head_g: string | number | null;
  outside_temp_c: string | number | null;
  chiller_temp_c: string | number | null;
  meat_temp_c: string | number | null;
  raw_text: string;
  notes?: string | null;
  failures?: FailurePreview[];
  maintenance_events?: MaintenanceEventPreview[];
  created_at: string;
  updated_at: string;
};

type FormValues = {
  shiftDate: string;
  headsCount: string;
  co2UsedKg: string;
  outsideTempC: string;
  chillerTempC: string;
  meatTempC: string;
  notes: string;
};

const initialValues: FormValues = {
  shiftDate: "",
  headsCount: "",
  co2UsedKg: "",
  outsideTempC: "",
  chillerTempC: "",
  meatTempC: "",
  notes: "",
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function getPreferredMimeType() {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return "";
  }

  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];

  return candidates.find((item) => MediaRecorder.isTypeSupported(item)) ?? "";
}

function getFileExtension(mimeType: string) {
  if (mimeType.includes("ogg")) {
    return "ogg";
  }

  if (mimeType.includes("mp4")) {
    return "mp4";
  }

  return "webm";
}

function parseNumber(value: string) {
  if (value.trim() === "") {
    return null;
  }

  return Number(value);
}

function formatCo2PerHead(value: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return `${Number(value).toFixed(2)} g/head`;
}

function formatMetric(value: string | number | null, suffix: string) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return `${Number(value).toFixed(2)} ${suffix}`;
}

async function extractApiError(response: Response) {
  try {
    const data = (await response.json()) as { message?: string };
    return data.message ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}

export default function RecordPage() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [dictatedText, setDictatedText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState<"preview" | "save" | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);
  const [recordingErrorMessage, setRecordingErrorMessage] = useState<string | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<string | null>(null);
  const [savedShift, setSavedShift] = useState<ShiftResponse | null>(null);
  const [parsedPreview, setParsedPreview] = useState<ParsedShiftPreview | null>(null);
  const [aiSavedShift, setAiSavedShift] = useState<ShiftResponse | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSavedShift(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/shifts/manual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          shift_date: values.shiftDate,
          heads_count: parseNumber(values.headsCount),
          co2_used_kg: parseNumber(values.co2UsedKg),
          outside_temp_c: parseNumber(values.outsideTempC),
          chiller_temp_c: parseNumber(values.chillerTempC),
          meat_temp_c: parseNumber(values.meatTempC),
          raw_text: values.notes.trim(),
          notes: values.notes.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error(await extractApiError(response));
      }

      const data: ShiftResponse = await response.json();
      setSavedShift(data);
      setValues(initialValues);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save the shift.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const transcribeAudio = async (file: File) => {
    setIsTranscribing(true);
    setRecordingErrorMessage(null);
    setRecordingStatus("Transcribing audio...");

    try {
      const formData = new FormData();
      formData.append("audio", file);

      const response = await fetch(`${apiBaseUrl}/api/transcribe`, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await extractApiError(response));
      }

      const data = (await response.json()) as { text: string };

      setDictatedText(data.text);
      setParsedPreview(null);
      setAiSavedShift(null);
      setAiErrorMessage(null);
      setRecordingStatus("Transcript added to the dictated report. Review and edit it before saving.");
    } catch (error) {
      setRecordingErrorMessage(error instanceof Error ? error.message : "Unable to transcribe the audio.");
      setRecordingStatus(null);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleStartRecording = async () => {
    if (isRecording || isTranscribing) {
      return;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordingErrorMessage("This browser does not support microphone recording.");
      return;
    }

    setRecordingErrorMessage(null);
    setRecordingStatus(null);
    setParsedPreview(null);
    setAiSavedShift(null);
    setAiErrorMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getPreferredMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", async () => {
        const recordedMimeType = recorder.mimeType || mimeType || "audio/webm";
        const extension = getFileExtension(recordedMimeType);
        const blob = new Blob(recordedChunksRef.current, {
          type: recordedMimeType,
        });

        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        recordedChunksRef.current = [];
        setIsRecording(false);

        if (blob.size === 0) {
          setRecordingErrorMessage("No audio was captured. Please try recording again.");
          return;
        }

        const file = new File([blob], `shift-report.${extension}`, {
          type: recordedMimeType,
        });

        await transcribeAudio(file);
      });

      recorder.start();
      setIsRecording(true);
      setRecordingStatus("Recording in progress...");
    } catch (error) {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      recordedChunksRef.current = [];
      setIsRecording(false);
      setRecordingErrorMessage(
        error instanceof Error ? error.message : "Unable to access the microphone.",
      );
      setRecordingStatus(null);
    }
  };

  const handleStopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
      return;
    }

    setRecordingStatus("Stopping recording...");
    mediaRecorderRef.current.stop();
  };

  const handlePreview = async () => {
    setIsAiLoading("preview");
    setAiErrorMessage(null);
    setAiSavedShift(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/shifts/from-text/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          text: dictatedText,
        }),
      });

      if (!response.ok) {
        throw new Error(await extractApiError(response));
      }

      const data: PreviewResponse = await response.json();
      setParsedPreview(data.parsed);
    } catch (error) {
      setAiErrorMessage(error instanceof Error ? error.message : "Unable to analyze the report.");
    } finally {
      setIsAiLoading(null);
    }
  };

  const handleAiSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsAiLoading("save");
    setAiErrorMessage(null);
    setAiSavedShift(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/shifts/from-text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          text: dictatedText,
        }),
      });

      if (!response.ok) {
        throw new Error(await extractApiError(response));
      }

      const data: ShiftResponse = await response.json();
      setAiSavedShift(data);
      setParsedPreview(null);
      setDictatedText("");
    } catch (error) {
      setAiErrorMessage(error instanceof Error ? error.message : "Unable to analyze and save the report.");
    } finally {
      setIsAiLoading(null);
    }
  };

  return (
    <main className="page-shell">
      <section className="hero-card form-card">
        <Link href="/" className="back-link">
          Back
        </Link>

        <p className="eyebrow">Shift entry</p>
        <h1>Record Shift</h1>
        <p className="intro">
          Save a quick end-of-shift journal entry from dictated text or by filling in the core numbers manually.
        </p>

        <section className="section-block">
          <div className="section-heading-wrap">
            <h2 className="section-heading">Dictated shift report</h2>
            <p className="section-text">
              Paste a free-form report in Russian, Romanian, or English, or record it with your microphone. Review
              and edit the transcript before analyzing and saving.
            </p>
          </div>

          <form className="record-form" onSubmit={handleAiSave}>
            <div className="button-row">
              <button
                type="button"
                className="secondary-button"
                onClick={handleStartRecording}
                disabled={isRecording || isTranscribing || isAiLoading !== null}
              >
                {isTranscribing ? "Transcribing..." : "Start recording"}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={handleStopRecording}
                disabled={!isRecording}
              >
                Stop recording
              </button>
            </div>

            {recordingStatus ? <p className="inline-status">{recordingStatus}</p> : null}

            <label className="field">
              <span className="field-label">Dictated shift report</span>
              <textarea
                className="text-input text-area large-textarea"
                rows={8}
                value={dictatedText}
                onChange={(event) => {
                  setDictatedText(event.target.value);
                  setParsedPreview(null);
                  setAiSavedShift(null);
                  setAiErrorMessage(null);
                }}
                placeholder="Сегодня переработали 620 голов. CO2 ушло 170 кг. Пилоты тухли два раза..."
                required
              />
            </label>

            <div className="button-row">
              <button
                type="button"
                className="secondary-button"
                onClick={handlePreview}
                disabled={isAiLoading !== null || isRecording || isTranscribing || dictatedText.trim() === ""}
              >
                {isAiLoading === "preview" ? "Analyzing..." : "Preview parse"}
              </button>

              <button
                type="submit"
                className="action-button"
                disabled={isAiLoading !== null || isRecording || isTranscribing || dictatedText.trim() === ""}
              >
                {isAiLoading === "save" ? "Saving..." : "Analyze and save"}
              </button>
            </div>
          </form>

          {recordingErrorMessage ? (
            <p className="status-banner status-error" role="alert">
              {recordingErrorMessage}
            </p>
          ) : null}

          {aiErrorMessage ? (
            <p className="status-banner status-error" role="alert">
              {aiErrorMessage}
            </p>
          ) : null}

          {parsedPreview ? (
            <div className="preview-card" role="status">
              <h3 className="section-title">Parsed preview</h3>

              <dl className="metric-grid metric-grid-single">
                <div className="metric-item">
                  <dt>Date</dt>
                  <dd>{parsedPreview.shift_date}</dd>
                </div>
                <div className="metric-item">
                  <dt>Heads</dt>
                  <dd>{parsedPreview.heads_count ?? "—"}</dd>
                </div>
                <div className="metric-item">
                  <dt>CO2 used</dt>
                  <dd>{formatMetric(parsedPreview.co2_used_kg, "kg")}</dd>
                </div>
                <div className="metric-item">
                  <dt>CO2 / head</dt>
                  <dd>{formatCo2PerHead(parsedPreview.co2_per_head_g) ?? "Not calculated"}</dd>
                </div>
                <div className="metric-item">
                  <dt>Outside temp</dt>
                  <dd>{formatMetric(parsedPreview.outside_temp_c, "°C")}</dd>
                </div>
                <div className="metric-item">
                  <dt>Chiller temp</dt>
                  <dd>{formatMetric(parsedPreview.chiller_temp_c, "°C")}</dd>
                </div>
                <div className="metric-item">
                  <dt>Meat temp</dt>
                  <dd>{formatMetric(parsedPreview.meat_temp_c, "°C")}</dd>
                </div>
              </dl>

              <div className="preview-stack">
                <div>
                  <p className="preview-label">Notes</p>
                  <p className="preview-copy">{parsedPreview.notes || "—"}</p>
                </div>

                <div>
                  <p className="preview-label">Failures</p>
                  {parsedPreview.failures.length > 0 ? (
                    <div className="list-stack">
                      {parsedPreview.failures.map((failure, index) => (
                        <div key={`${failure.problem ?? "failure"}-${index}`} className="list-card">
                          <p className="entry-title">
                            {failure.equipment_name || "General issue"}
                            {failure.severity ? ` · ${failure.severity}` : ""}
                          </p>
                          <p className="entry-copy">{failure.problem || "—"}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="preview-copy">No failures detected.</p>
                  )}
                </div>

                <div>
                  <p className="preview-label">Maintenance events</p>
                  {parsedPreview.maintenance_events.length > 0 ? (
                    <div className="list-stack">
                      {parsedPreview.maintenance_events.map((event, index) => (
                        <div key={`${event.action ?? "maintenance"}-${index}`} className="list-card">
                          <p className="entry-title">{event.equipment_name || "General maintenance"}</p>
                          <p className="entry-copy">{event.action || "—"}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="preview-copy">No maintenance events detected.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {aiSavedShift ? (
            <div className="status-banner status-success" role="status">
              <p className="status-title">AI shift saved successfully.</p>
              <p className="status-copy">
                CO2 per head: {formatCo2PerHead(aiSavedShift.co2_per_head_g) ?? "Not calculated"}
              </p>
              <Link href={`/shifts/${aiSavedShift.id}`} className="text-link status-link">
                Open saved shift
              </Link>
            </div>
          ) : null}
        </section>

        <div className="section-divider" />

        <section className="section-block">
          <div className="section-heading-wrap">
            <h2 className="section-heading">Manual entry</h2>
            <p className="section-text">Use this form when you want to enter only the main production values.</p>
          </div>

          <form className="record-form" onSubmit={handleSubmit}>
            <label className="field">
              <span className="field-label">Date</span>
              <input
                type="date"
                className="text-input"
                value={values.shiftDate}
                onChange={(event) => setValues({ ...values, shiftDate: event.target.value })}
                required
              />
            </label>

            <label className="field">
              <span className="field-label">Heads count</span>
              <input
                type="number"
                className="text-input"
                inputMode="numeric"
                min="1"
                step="1"
                value={values.headsCount}
                onChange={(event) => setValues({ ...values, headsCount: event.target.value })}
              />
            </label>

            <label className="field">
              <span className="field-label">CO2 used kg</span>
              <input
                type="number"
                className="text-input"
                inputMode="decimal"
                step="0.01"
                value={values.co2UsedKg}
                onChange={(event) => setValues({ ...values, co2UsedKg: event.target.value })}
              />
            </label>

            <label className="field">
              <span className="field-label">Outside temperature</span>
              <input
                type="number"
                className="text-input"
                inputMode="decimal"
                step="0.1"
                value={values.outsideTempC}
                onChange={(event) => setValues({ ...values, outsideTempC: event.target.value })}
              />
            </label>

            <label className="field">
              <span className="field-label">Chiller temperature</span>
              <input
                type="number"
                className="text-input"
                inputMode="decimal"
                step="0.1"
                value={values.chillerTempC}
                onChange={(event) => setValues({ ...values, chillerTempC: event.target.value })}
              />
            </label>

            <label className="field">
              <span className="field-label">Meat temperature</span>
              <input
                type="number"
                className="text-input"
                inputMode="decimal"
                step="0.1"
                value={values.meatTempC}
                onChange={(event) => setValues({ ...values, meatTempC: event.target.value })}
              />
            </label>

            <label className="field">
              <span className="field-label">Notes</span>
              <textarea
                className="text-input text-area"
                rows={4}
                value={values.notes}
                onChange={(event) => setValues({ ...values, notes: event.target.value })}
              />
            </label>

            <button type="submit" className="action-button" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </form>
        </section>

        {errorMessage ? (
          <p className="status-banner status-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {savedShift ? (
          <div className="status-banner status-success" role="status">
            <p className="status-title">Shift saved successfully.</p>
            <p className="status-copy">
              CO2 per head: {formatCo2PerHead(savedShift.co2_per_head_g) ?? "Not calculated"}
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
