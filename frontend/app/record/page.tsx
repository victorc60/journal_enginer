"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import AccordionSection from "@/components/AccordionSection";
import { apiBaseUrl, extractApiError } from "@/lib/api";
import { formatCo2PerHead, formatMetric } from "@/lib/format";

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

type HandoverPreview = {
  equipment_name: string | null;
  title: string | null;
  details: string | null;
  assigned_to: string | null;
  due_date: string | null;
  priority: string | null;
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
  handover_items: HandoverPreview[];
};

type PreviewResponse = {
  raw_text: string;
  parsed: ParsedShiftPreview;
};

type SavedShiftResponse = {
  id: number;
  shift_date: string;
  co2_per_head_g: string | number | null;
};

type FormValues = {
  shiftDate: string;
  headsCount: string;
  workHours: string;
  co2StartKg: string;
  co2EndKg: string;
  co2UsedKg: string;
  outsideTempC: string;
  chillerTempC: string;
  meatTempC: string;
  notes: string;
};

type HandoverDraft = {
  title: string;
  details: string;
  equipment_name: string;
  assigned_to: string;
  due_date: string;
  priority: string;
};

type ChecklistResult = {
  critical: string[];
  advisory: string[];
};

const initialValues: FormValues = {
  shiftDate: "",
  headsCount: "",
  workHours: "",
  co2StartKg: "",
  co2EndKg: "",
  co2UsedKg: "",
  outsideTempC: "",
  chillerTempC: "",
  meatTempC: "",
  notes: "",
};

function createHandoverDraft(): HandoverDraft {
  return {
    title: "",
    details: "",
    equipment_name: "",
    assigned_to: "",
    due_date: "",
    priority: "normal",
  };
}

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

function normalizeManualHandoverItems(items: HandoverDraft[]) {
  return items
    .map((item) => ({
      title: item.title.trim() || item.details.trim().slice(0, 160),
      details: item.details.trim() || null,
      equipment_name: item.equipment_name.trim() || null,
      assigned_to: item.assigned_to.trim() || null,
      due_date: item.due_date || null,
      priority: item.priority || "normal",
    }))
    .filter((item) => item.title !== "");
}

function buildManualChecklist(values: FormValues, handoverItems: HandoverDraft[], selectedFiles: File[]): ChecklistResult {
  const hasManualActivity =
    values.shiftDate.trim() !== "" ||
    values.headsCount.trim() !== "" ||
    values.workHours.trim() !== "" ||
    values.co2StartKg.trim() !== "" ||
    values.co2EndKg.trim() !== "" ||
    values.co2UsedKg.trim() !== "" ||
    values.outsideTempC.trim() !== "" ||
    values.chillerTempC.trim() !== "" ||
    values.meatTempC.trim() !== "" ||
    values.notes.trim() !== "" ||
    handoverItems.some(
      (item) =>
        item.title.trim() !== "" ||
        item.details.trim() !== "" ||
        item.equipment_name.trim() !== "" ||
        item.assigned_to.trim() !== "" ||
        item.due_date.trim() !== "",
    ) ||
    selectedFiles.length > 0;

  if (!hasManualActivity) {
    return { critical: [], advisory: [] };
  }

  const critical: string[] = [];
  const advisory: string[] = [];

  if (values.shiftDate.trim() === "") {
    critical.push("Не указана дата смены.");
  }

  if (values.headsCount.trim() === "") {
    critical.push("Не указано количество голов.");
  }

  if (values.co2UsedKg.trim() === "") {
    critical.push("Не указан расход CO2.");
  }

  if (values.chillerTempC.trim() === "") {
    critical.push("Не указана температура холодильника.");
  }

  if (values.meatTempC.trim() === "") {
    critical.push("Не указана температура мяса.");
  }

  const partialHandoverRows = handoverItems.filter((item) => {
    const hasSomeContent =
      item.title.trim() !== "" ||
      item.details.trim() !== "" ||
      item.equipment_name.trim() !== "" ||
      item.assigned_to.trim() !== "" ||
      item.due_date.trim() !== "";

    return hasSomeContent && item.title.trim() === "" && item.details.trim() === "";
  });

  if (partialHandoverRows.length > 0) {
    critical.push("Есть незаполненные handover-пункты без заголовка или описания.");
  }

  if (values.notes.trim() === "") {
    advisory.push("Нет текстовых заметок по смене.");
  }

  if (values.co2StartKg.trim() === "" || values.co2EndKg.trim() === "") {
    advisory.push("Для контроля газохранилища лучше указывать CO2 start и CO2 end.");
  }

  if (normalizeManualHandoverItems(handoverItems).length === 0) {
    advisory.push("Нет handover-пунктов для следующей смены.");
  }

  if (selectedFiles.length === 0) {
    advisory.push("Нет фото, аудио или документов во вложениях.");
  }

  return { critical, advisory };
}

function buildAiChecklist(parsedPreview: ParsedShiftPreview | null, selectedFiles: File[], dictatedText: string): ChecklistResult {
  if (!parsedPreview && dictatedText.trim() === "") {
    return { critical: [], advisory: [] };
  }

  if (!parsedPreview) {
    return { critical: ["Сначала сделайте Preview parse перед сохранением AI-отчета."], advisory: [] };
  }

  const critical: string[] = [];
  const advisory: string[] = [];

  if (parsedPreview.heads_count === null) {
    critical.push("AI не распознал количество голов.");
  }

  if (parsedPreview.co2_used_kg === null) {
    critical.push("AI не распознал расход CO2.");
  }

  if (parsedPreview.chiller_temp_c === null) {
    critical.push("AI не распознал температуру холодильника.");
  }

  if (parsedPreview.meat_temp_c === null) {
    critical.push("AI не распознал температуру мяса.");
  }

  if (parsedPreview.failures.length > 0 && parsedPreview.handover_items.length === 0) {
    advisory.push("Есть поломки, но нет handover-пунктов для следующей смены.");
  }

  if (!parsedPreview.notes && parsedPreview.failures.length === 0 && parsedPreview.maintenance_events.length === 0) {
    advisory.push("В отчете мало контекста кроме числовых полей.");
  }

  if (selectedFiles.length === 0) {
    advisory.push("Нет фото, аудио или документов во вложениях.");
  }

  return { critical, advisory };
}

async function uploadShiftAttachments(shiftId: number, files: File[]) {
  if (files.length === 0) {
    return 0;
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files[]", file);
  });

  const response = await fetch(`${apiBaseUrl}/api/shifts/${shiftId}/attachments`, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await extractApiError(response, "Shift saved, but attachments failed to upload."));
  }

  const uploaded = (await response.json()) as unknown[];
  return uploaded.length;
}

export default function RecordPage() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [dictatedText, setDictatedText] = useState("");
  const [manualHandoverItems, setManualHandoverItems] = useState<HandoverDraft[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState<"preview" | "save" | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);
  const [recordingErrorMessage, setRecordingErrorMessage] = useState<string | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<string | null>(null);
  const [attachmentStatusMessage, setAttachmentStatusMessage] = useState<string | null>(null);
  const [savedShift, setSavedShift] = useState<SavedShiftResponse | null>(null);
  const [parsedPreview, setParsedPreview] = useState<ParsedShiftPreview | null>(null);
  const [aiSavedShift, setAiSavedShift] = useState<SavedShiftResponse | null>(null);
  const [manualChecklistConfirmed, setManualChecklistConfirmed] = useState(false);
  const [aiChecklistConfirmed, setAiChecklistConfirmed] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const manualChecklist = buildManualChecklist(values, manualHandoverItems, selectedFiles);
  const aiChecklist = buildAiChecklist(parsedPreview, selectedFiles, dictatedText);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const resetSharedArtifacts = () => {
    setSelectedFiles([]);
  };

  const handleAttachmentUpload = async (shiftId: number) => {
    if (selectedFiles.length === 0) {
      setAttachmentStatusMessage("No attachments were selected.");
      return;
    }

    const uploadedCount = await uploadShiftAttachments(shiftId, selectedFiles);
    setAttachmentStatusMessage(`Uploaded ${uploadedCount} attachment${uploadedCount === 1 ? "" : "s"}.`);
    setSelectedFiles([]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSavedShift(null);
    setAttachmentStatusMessage(null);

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
          work_hours: parseNumber(values.workHours),
          co2_start_kg: parseNumber(values.co2StartKg),
          co2_end_kg: parseNumber(values.co2EndKg),
          co2_used_kg: parseNumber(values.co2UsedKg),
          outside_temp_c: parseNumber(values.outsideTempC),
          chiller_temp_c: parseNumber(values.chillerTempC),
          meat_temp_c: parseNumber(values.meatTempC),
          raw_text: values.notes.trim(),
          notes: values.notes.trim() || null,
          handover_items: normalizeManualHandoverItems(manualHandoverItems),
        }),
      });

      if (!response.ok) {
        throw new Error(await extractApiError(response, "Unable to save the shift."));
      }

      const data: SavedShiftResponse = await response.json();

      if (selectedFiles.length > 0) {
        await handleAttachmentUpload(data.id);
      }

      setSavedShift(data);
      setValues(initialValues);
      setManualHandoverItems([]);
      setManualChecklistConfirmed(false);
      resetSharedArtifacts();
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
        throw new Error(await extractApiError(response, "Unable to transcribe the audio."));
      }

      const data = (await response.json()) as { text: string };

      setDictatedText(data.text);
      setParsedPreview(null);
      setAiSavedShift(null);
      setAiErrorMessage(null);
      setAiChecklistConfirmed(false);
      setRecordingStatus("Transcript added to the dictated report. Review it, run Preview parse, then save.");
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
    setAiChecklistConfirmed(false);

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
      setRecordingErrorMessage(error instanceof Error ? error.message : "Unable to access the microphone.");
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
    setAiChecklistConfirmed(false);

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
        throw new Error(await extractApiError(response, "Unable to analyze the report."));
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

    if (!parsedPreview) {
      setAiErrorMessage("Run Preview parse first so the checklist can validate the entry.");
      return;
    }

    setIsAiLoading("save");
    setAiErrorMessage(null);
    setAiSavedShift(null);
    setAttachmentStatusMessage(null);

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
        throw new Error(await extractApiError(response, "Unable to analyze and save the report."));
      }

      const data: SavedShiftResponse = await response.json();

      if (selectedFiles.length > 0) {
        await handleAttachmentUpload(data.id);
      }

      setAiSavedShift(data);
      setParsedPreview(null);
      setDictatedText("");
      setAiChecklistConfirmed(false);
      resetSharedArtifacts();
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
          Save a complete shift with dictation or manual entry, check data quality before saving, and attach files for
          evidence and handover.
        </p>

        <AccordionSection
          title="Attachments"
          description="Add photos, documents, or audio notes. They will upload right after the shift is saved."
          badge={selectedFiles.length > 0 ? `${selectedFiles.length} files` : "Optional"}
        >
          <label className="field">
            <span className="field-label">Evidence files</span>
            <input
              type="file"
              multiple
              className="text-input"
              accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.mp3,.mp4,.m4a,.ogg,.wav,.webm"
              onChange={(event) => {
                setSelectedFiles(Array.from(event.target.files ?? []));
                setAttachmentStatusMessage(null);
              }}
            />
          </label>

          {selectedFiles.length > 0 ? (
            <div className="list-stack">
              {selectedFiles.map((file) => (
                <div key={`${file.name}-${file.size}`} className="list-card">
                  <p className="entry-title">{file.name}</p>
                  <p className="entry-copy">{Math.round(file.size / 1024)} KB</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="section-empty">No attachments selected yet.</p>
          )}

          {attachmentStatusMessage ? <p className="inline-status">{attachmentStatusMessage}</p> : null}
        </AccordionSection>

        <AccordionSection
          title="Dictated shift report"
          description="Paste a free-form report in Russian, Romanian, or English, or record it with your microphone. Preview is required before saving."
          badge={parsedPreview ? "Preview ready" : "AI"}
          defaultOpen
        >

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

              <button type="button" className="secondary-button" onClick={handleStopRecording} disabled={!isRecording}>
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
                  setAiChecklistConfirmed(false);
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
                disabled={
                  isAiLoading !== null ||
                  isRecording ||
                  isTranscribing ||
                  dictatedText.trim() === "" ||
                  !parsedPreview ||
                  (aiChecklist.critical.length > 0 && !aiChecklistConfirmed)
                }
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

          <AccordionSection
            title="AI save checklist"
            description="Before saving, review critical issues and advisory notes."
            badge={`${aiChecklist.critical.length} critical`}
            defaultOpen={Boolean(parsedPreview) || aiChecklist.critical.length > 0}
            nested
          >
            {aiChecklist.critical.length > 0 || aiChecklist.advisory.length > 0 ? (
              <div className="preview-stack">
                {aiChecklist.critical.length > 0 ? (
                  <div>
                    <p className="preview-label">Critical</p>
                    <ul className="checklist-list">
                      {aiChecklist.critical.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {aiChecklist.advisory.length > 0 ? (
                  <div>
                    <p className="preview-label">Advisory</p>
                    <ul className="checklist-list">
                      {aiChecklist.advisory.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="section-empty">Checklist looks good after preview.</p>
            )}

            {parsedPreview && aiChecklist.critical.length > 0 ? (
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={aiChecklistConfirmed}
                  onChange={(event) => setAiChecklistConfirmed(event.target.checked)}
                />
                <span>Понимаю замечания и всё равно хочу сохранить AI-разбор.</span>
              </label>
            ) : null}
          </AccordionSection>

          {parsedPreview ? (
            <AccordionSection
              title="Parsed preview"
              description="Review metrics, notes, failures, and handover before saving."
              badge={`${parsedPreview.handover_items.length} handover`}
              defaultOpen
              nested
            >
              <div className="preview-card" role="status">
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
                    <dt>CO2 start</dt>
                    <dd>{formatMetric(parsedPreview.co2_start_kg, "kg")}</dd>
                  </div>
                  <div className="metric-item">
                    <dt>CO2 end</dt>
                    <dd>{formatMetric(parsedPreview.co2_end_kg, "kg")}</dd>
                  </div>
                  <div className="metric-item">
                    <dt>CO2 used</dt>
                    <dd>{formatMetric(parsedPreview.co2_used_kg, "kg")}</dd>
                  </div>
                  <div className="metric-item">
                    <dt>CO2 / head</dt>
                    <dd>{formatCo2PerHead(parsedPreview.co2_per_head_g)}</dd>
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

                  <div>
                    <p className="preview-label">Handover items</p>
                    {parsedPreview.handover_items.length > 0 ? (
                      <div className="list-stack">
                        {parsedPreview.handover_items.map((item, index) => (
                          <div key={`${item.title ?? "handover"}-${index}`} className="list-card">
                            <p className="entry-title">{item.title || "Untitled follow-up"}</p>
                            <p className="entry-copy">{item.details || "No details."}</p>
                            <p className="entry-copy">
                              {item.equipment_name || "General"} · {item.priority || "normal"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="preview-copy">No handover items detected.</p>
                    )}
                  </div>
                </div>
              </div>
            </AccordionSection>
          ) : null}

          {aiSavedShift ? (
            <div className="status-banner status-success" role="status">
              <p className="status-title">AI shift saved successfully.</p>
              <p className="status-copy">CO2 per head: {formatCo2PerHead(aiSavedShift.co2_per_head_g)}</p>
              <Link href={`/shifts/${aiSavedShift.id}`} className="text-link status-link">
                Open saved shift
              </Link>
            </div>
          ) : null}
        </AccordionSection>

        <AccordionSection
          title="Manual entry"
          description="Use this form when you want to enter core numbers directly and prepare a handover for the next shift."
          badge="Direct input"
        >
          <AccordionSection
            title="Manual save checklist"
            description="Before saving, review required fields and handover quality."
            badge={`${manualChecklist.critical.length} critical`}
            defaultOpen={manualChecklist.critical.length > 0}
            nested
          >
            {manualChecklist.critical.length > 0 || manualChecklist.advisory.length > 0 ? (
              <div className="preview-stack">
                {manualChecklist.critical.length > 0 ? (
                  <div>
                    <p className="preview-label">Critical</p>
                    <ul className="checklist-list">
                      {manualChecklist.critical.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {manualChecklist.advisory.length > 0 ? (
                  <div>
                    <p className="preview-label">Advisory</p>
                    <ul className="checklist-list">
                      {manualChecklist.advisory.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="section-empty">Checklist looks good for manual save.</p>
            )}

            {manualChecklist.critical.length > 0 ? (
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={manualChecklistConfirmed}
                  onChange={(event) => setManualChecklistConfirmed(event.target.checked)}
                />
                <span>Понимаю замечания и всё равно хочу сохранить ручную запись.</span>
              </label>
            ) : null}
          </AccordionSection>

          <form className="record-form" onSubmit={handleSubmit}>
            <AccordionSection
              title="Core metrics"
              description="Date, heads count, and work hours for the shift."
              badge="Base"
              defaultOpen
              nested
            >
              <div className="filter-grid">
                <label className="field">
                  <span className="field-label">Date</span>
                  <input
                    type="date"
                    className="text-input"
                    value={values.shiftDate}
                    onChange={(event) => {
                      setValues({ ...values, shiftDate: event.target.value });
                      setManualChecklistConfirmed(false);
                    }}
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
                    onChange={(event) => {
                      setValues({ ...values, headsCount: event.target.value });
                      setManualChecklistConfirmed(false);
                    }}
                  />
                </label>

                <label className="field">
                  <span className="field-label">Work hours</span>
                  <input
                    type="number"
                    className="text-input"
                    inputMode="decimal"
                    step="0.25"
                    value={values.workHours}
                    onChange={(event) => setValues({ ...values, workHours: event.target.value })}
                  />
                </label>
              </div>
            </AccordionSection>

            <AccordionSection
              title="CO2 and temperatures"
              description="Gas usage, outside temperature, chiller, and meat temperature."
              badge="6 fields"
              nested
            >
              <div className="filter-grid">
                <label className="field">
                  <span className="field-label">CO2 start kg</span>
                  <input
                    type="number"
                    className="text-input"
                    inputMode="decimal"
                    step="0.01"
                    value={values.co2StartKg}
                    onChange={(event) => setValues({ ...values, co2StartKg: event.target.value })}
                  />
                </label>

                <label className="field">
                  <span className="field-label">CO2 end kg</span>
                  <input
                    type="number"
                    className="text-input"
                    inputMode="decimal"
                    step="0.01"
                    value={values.co2EndKg}
                    onChange={(event) => setValues({ ...values, co2EndKg: event.target.value })}
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
                    onChange={(event) => {
                      setValues({ ...values, co2UsedKg: event.target.value });
                      setManualChecklistConfirmed(false);
                    }}
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
                    onChange={(event) => {
                      setValues({ ...values, chillerTempC: event.target.value });
                      setManualChecklistConfirmed(false);
                    }}
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
                    onChange={(event) => {
                      setValues({ ...values, meatTempC: event.target.value });
                      setManualChecklistConfirmed(false);
                    }}
                  />
                </label>
              </div>
            </AccordionSection>

            <AccordionSection
              title="Shift notes"
              description="Short text notes about the shift, deviations, or anything important to pass on."
              badge={values.notes.trim() === "" ? "Optional" : "Filled"}
              nested
            >
              <label className="field">
                <span className="field-label">Notes</span>
                <textarea
                  className="text-input text-area"
                  rows={4}
                  value={values.notes}
                  onChange={(event) => setValues({ ...values, notes: event.target.value })}
                />
              </label>
            </AccordionSection>

            <AccordionSection
              title="Handover items"
              description="Capture what the next shift must check, finish, or monitor."
              badge={`${manualHandoverItems.length} items`}
              defaultOpen={manualHandoverItems.length > 0}
              nested
            >
              <div className="detail-section">
                <div className="toolbar-row toolbar-row-spread">
                  <div>
                    <h3 className="section-title">Handover items</h3>
                    <p className="section-text">Capture what the next shift must check, finish, or monitor.</p>
                  </div>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setManualHandoverItems((current) => [...current, createHandoverDraft()])}
                  >
                    Add handover item
                  </button>
                </div>

                {manualHandoverItems.length > 0 ? (
                  <div className="list-stack">
                    {manualHandoverItems.map((item, index) => (
                      <div key={`handover-${index}`} className="list-card">
                        <div className="filter-grid">
                          <label className="field">
                            <span className="field-label">Title</span>
                            <input
                              className="text-input"
                              value={item.title}
                              onChange={(event) => {
                                const next = [...manualHandoverItems];
                                next[index] = { ...item, title: event.target.value };
                                setManualHandoverItems(next);
                                setManualChecklistConfirmed(false);
                              }}
                            />
                          </label>

                          <label className="field">
                            <span className="field-label">Equipment</span>
                            <input
                              className="text-input"
                              value={item.equipment_name}
                              onChange={(event) => {
                                const next = [...manualHandoverItems];
                                next[index] = { ...item, equipment_name: event.target.value };
                                setManualHandoverItems(next);
                              }}
                            />
                          </label>

                          <label className="field">
                            <span className="field-label">Assigned to</span>
                            <input
                              className="text-input"
                              value={item.assigned_to}
                              onChange={(event) => {
                                const next = [...manualHandoverItems];
                                next[index] = { ...item, assigned_to: event.target.value };
                                setManualHandoverItems(next);
                              }}
                            />
                          </label>

                          <label className="field">
                            <span className="field-label">Due date</span>
                            <input
                              type="date"
                              className="text-input"
                              value={item.due_date}
                              onChange={(event) => {
                                const next = [...manualHandoverItems];
                                next[index] = { ...item, due_date: event.target.value };
                                setManualHandoverItems(next);
                              }}
                            />
                          </label>

                          <label className="field">
                            <span className="field-label">Priority</span>
                            <select
                              className="text-input"
                              value={item.priority}
                              onChange={(event) => {
                                const next = [...manualHandoverItems];
                                next[index] = { ...item, priority: event.target.value };
                                setManualHandoverItems(next);
                              }}
                            >
                              <option value="normal">Normal</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                              <option value="low">Low</option>
                            </select>
                          </label>
                        </div>

                        <label className="field">
                          <span className="field-label">Details</span>
                          <textarea
                            className="text-input text-area"
                            rows={3}
                            value={item.details}
                            onChange={(event) => {
                              const next = [...manualHandoverItems];
                              next[index] = { ...item, details: event.target.value };
                              setManualHandoverItems(next);
                              setManualChecklistConfirmed(false);
                            }}
                          />
                        </label>

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            setManualHandoverItems((current) =>
                              current.filter((_, currentIndex) => currentIndex !== index),
                            );
                            setManualChecklistConfirmed(false);
                          }}
                        >
                          Remove handover item
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="section-empty">No manual handover items yet.</p>
                )}
              </div>
            </AccordionSection>

            <button
              type="submit"
              className="action-button"
              disabled={isSubmitting || (manualChecklist.critical.length > 0 && !manualChecklistConfirmed)}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </form>
        </AccordionSection>

        {errorMessage ? (
          <p className="status-banner status-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {savedShift ? (
          <div className="status-banner status-success" role="status">
            <p className="status-title">Shift saved successfully.</p>
            <p className="status-copy">CO2 per head: {formatCo2PerHead(savedShift.co2_per_head_g)}</p>
            <Link href={`/shifts/${savedShift.id}`} className="text-link status-link">
              Open saved shift
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
