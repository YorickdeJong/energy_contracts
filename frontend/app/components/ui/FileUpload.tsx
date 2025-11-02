"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import Button from "./Button";
import {
  DocumentTextIcon,
  PhotoIcon,
  TableCellsIcon,
  DocumentIcon,
  PaperClipIcon,
} from "@heroicons/react/24/outline";

export interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

const FileUpload = ({
  accept = ".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx",
  multiple = true,
  maxSize = 10 * 1024 * 1024, // 10MB default
  onFilesSelected,
  disabled = false,
}: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = (files: FileList | null): File[] => {
    if (!files || files.length === 0) return [];

    const validFiles: File[] = [];
    const newErrors: string[] = [];

    const acceptedTypes = accept
      .split(",")
      .map((type) => type.trim().toLowerCase());

    Array.from(files).forEach((file) => {
      // Check file size
      if (file.size > maxSize) {
        newErrors.push(
          `${file.name} exceeds maximum size of ${formatFileSize(maxSize)}`
        );
        return;
      }

      // Check file type
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
      const mimeType = file.type.toLowerCase();

      const isValidType = acceptedTypes.some(
        (type) =>
          type === fileExtension ||
          (type.startsWith(".") && fileExtension === type) ||
          (!type.startsWith(".") && mimeType.includes(type))
      );

      if (!isValidType) {
        newErrors.push(
          `${file.name} is not an accepted file type. Accepted types: ${accept}`
        );
        return;
      }

      validFiles.push(file);
    });

    setErrors(newErrors);
    return validFiles;
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = validateFiles(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = validateFiles(e.target.files);
    if (files.length > 0) {
      onFilesSelected(files);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    const iconClassName = "w-6 h-6";

    switch (extension) {
      case "pdf":
        return <DocumentTextIcon className={iconClassName} />;
      case "jpg":
      case "jpeg":
      case "png":
        return <PhotoIcon className={iconClassName} />;
      case "xlsx":
      case "xls":
        return <TableCellsIcon className={iconClassName} />;
      case "doc":
      case "docx":
        return <DocumentIcon className={iconClassName} />;
      default:
        return <PaperClipIcon className={iconClassName} />;
    }
  };

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative
          border-2 border-dashed rounded-2xl
          p-8
          text-center
          transition-all duration-200 ease-in-out
          ${
            isDragging
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-border bg-background-secondary hover:border-primary/50"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
        onClick={!disabled ? handleBrowseClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          disabled={disabled}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4">
          {/* Upload Icon */}
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          {/* Text */}
          <div>
            <p className="text-lg font-medium text-text-primary mb-1">
              {isDragging ? "Drop files here" : "Drag & drop files here"}
            </p>
            <p className="text-sm text-text-secondary">or</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                handleBrowseClick();
              }}
            >
              Browse Files
            </Button>
          </div>

          {/* File info */}
          <div className="text-xs text-text-tertiary">
            <p>
              Accepted formats: {accept.replace(/\./g, "").toUpperCase()}
            </p>
            <p>Maximum file size: {formatFileSize(maxSize)}</p>
          </div>
        </div>
      </div>

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="mt-4 space-y-2">
          {errors.map((error, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-3 bg-error/10 border border-error/20 rounded-xl"
            >
              <svg
                className="w-5 h-5 text-error flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-error">{error}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
