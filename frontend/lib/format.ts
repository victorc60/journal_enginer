export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatMetric(value: string | number | null | undefined, suffix: string) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return `${Number(value).toFixed(2)} ${suffix}`;
}

export function formatPlainValue(value: string | number | null | undefined, suffix?: string) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const numberValue = Number(value);

  if (!Number.isNaN(numberValue)) {
    if (suffix) {
      return `${numberValue.toFixed(Number.isInteger(numberValue) ? 0 : 2)} ${suffix}`;
    }

    return Number.isInteger(numberValue) ? String(numberValue) : numberValue.toFixed(2);
  }

  return String(value);
}

export function formatCo2PerHead(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return `${Number(value).toFixed(2)} g/head`;
}

export function formatFileSize(sizeBytes: number | null | undefined) {
  if (!sizeBytes || sizeBytes <= 0) {
    return "0 KB";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = sizeBytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
