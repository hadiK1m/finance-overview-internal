"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TagInputProps {
    value: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export default function TagInput({
    value,
    onChange,
    placeholder = "Ketik lalu tekan Enter…",
    className,
    disabled = false,
}: TagInputProps) {
    const [inputValue, setInputValue] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);

    function addTag(tag: string) {
        const trimmed = tag.trim();
        if (!trimmed) return;
        if (value.includes(trimmed)) return;
        onChange([...value, trimmed]);
        setInputValue("");
    }

    function removeTag(index: number) {
        onChange(value.filter((_, i) => i !== index));
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter") {
            e.preventDefault();
            addTag(inputValue);
        } else if (
            e.key === "Backspace" &&
            !inputValue &&
            value.length > 0
        ) {
            removeTag(value.length - 1);
        }
    }

    return (
        <div
            className={cn(
                "border-input focus-within:border-ring focus-within:ring-ring/50 flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border bg-transparent px-2.5 py-1.5 text-sm shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]",
                disabled && "cursor-not-allowed opacity-50",
                className,
            )}
            onClick={() => inputRef.current?.focus()}
        >
            {value.map((tag, index) => (
                <Badge
                    key={`${tag}-${index}`}
                    variant="secondary"
                    className="gap-1 px-2 py-0.5 text-xs"
                >
                    {tag}
                    {!disabled && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTag(index);
                            }}
                            className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
                        >
                            <X className="size-3" />
                        </button>
                    )}
                </Badge>
            ))}
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={value.length === 0 ? placeholder : ""}
                disabled={disabled}
                className="min-w-20 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            />
        </div>
    );
}
