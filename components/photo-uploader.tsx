"use client";

import { useRef, useState, useCallback } from "react";
import { Camera, X, CheckCircle2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PhotoUploaderProps {
  label?: string;
  required?: boolean;
  value?: string;
  onChange: (base64: string | undefined) => void;
  className?: string;
  size?: "default" | "large";
}

export function PhotoUploader({
  label = "Upload Foto",
  required = false,
  value,
  onChange,
  className,
  size = "default",
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = useCallback(
    async (file: File | undefined) => {
      if (!file) {
        onChange(undefined);
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Ukuran foto maksimal 5MB");
        return;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        alert("Hanya file gambar yang diperbolehkan");
        return;
      }

      setIsProcessing(true);

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        onChange(base64);
        setIsProcessing(false);
      };
      reader.onerror = () => {
        alert("Gagal membaca foto. Coba lagi.");
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    },
    [onChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFileChange(file);
  };

  const clearPhoto = () => {
    onChange(undefined);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const isLarge = size === "large";

  return (
    <div className={cn("space-y-3", className)}>
      {label && (
        <label className={cn(
          "block font-semibold text-foreground",
          isLarge ? "text-lg" : "text-sm"
        )}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInputChange}
        className="hidden"
      />

      {isProcessing ? (
        <div className={cn(
          "border-2 border-dashed border-primary rounded-xl flex flex-col items-center justify-center bg-primary/5",
          isLarge ? "min-h-[250px]" : "min-h-[180px]"
        )}>
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
          <p className="text-primary font-medium mt-4">Memproses foto...</p>
        </div>
      ) : value ? (
        // Photo Preview - Large and Clear
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden border-2 border-success bg-success/5">
            <img
              src={value}
              alt="Preview foto"
              className={cn(
                "w-full object-cover",
                isLarge ? "max-h-[300px]" : "max-h-[200px]"
              )}
            />
            {/* Success indicator */}
            <div className="absolute top-3 left-3 bg-success text-success-foreground px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Foto siap
            </div>
          </div>
          
          {/* Retake button - Large touch target */}
          <Button
            type="button"
            variant="outline"
            onClick={clearPhoto}
            className={cn(
              "w-full font-semibold",
              isLarge ? "h-14 text-base" : "h-12"
            )}
          >
            <RefreshCcw className="w-5 h-5 mr-2" />
            Ganti Foto
          </Button>
        </div>
      ) : (
        // Upload Button - Super Large and Clear
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "w-full border-2 border-dashed rounded-xl transition-all active:scale-[0.98]",
            "flex flex-col items-center justify-center gap-4",
            "border-primary/50 bg-primary/5 hover:bg-primary/10 hover:border-primary",
            isLarge ? "min-h-[220px] p-8" : "min-h-[160px] p-6"
          )}
        >
          <div className={cn(
            "rounded-full bg-primary/20 flex items-center justify-center",
            isLarge ? "w-20 h-20" : "w-14 h-14"
          )}>
            <Camera className={cn(
              "text-primary",
              isLarge ? "w-10 h-10" : "w-7 h-7"
            )} />
          </div>
          <div className="text-center">
            <p className={cn(
              "font-bold text-foreground",
              isLarge ? "text-xl" : "text-base"
            )}>
              KETUK UNTUK AMBIL FOTO
            </p>
            <p className={cn(
              "text-muted-foreground mt-1",
              isLarge ? "text-base" : "text-sm"
            )}>
              Arahkan kamera ke objek
            </p>
          </div>
        </button>
      )}
    </div>
  );
}
