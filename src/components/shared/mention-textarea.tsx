'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface MentionTextareaProps {
  value: string;
  onChange: (e: any) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  required?: boolean;
  as?: 'input' | 'textarea';
  type?: string;
}

export default function MentionTextarea({
  value,
  onChange,
  placeholder,
  className,
  rows,
  required,
  as = 'textarea',
  type = 'text',
}: MentionTextareaProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [triggerIndex, setTriggerIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getRef = () => {
    return as === 'input' ? inputRef : textareaRef;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    onChange(e);
  };

  useEffect(() => {
    const activeRef = getRef();
    if (!activeRef.current) return;

    const val = value;
    const cursor = activeRef.current.selectionStart || 0;

    // Son '@' işaretini bul
    const lastAt = val.lastIndexOf('@', cursor - 1);

    if (lastAt !== -1) {
      // '@' ile imleç arasında boşluk olup olmadığını kontrol et
      const textBetween = val.slice(lastAt + 1, cursor);
      if (!/\s/.test(textBetween)) {
        setTriggerIndex(lastAt);
        setSearchQuery(textBetween);
        setShowDropdown(true);
        return;
      }
    }

    setShowDropdown(false);
  }, [value]);

  useEffect(() => {
    if (!showDropdown || searchQuery === undefined) return;

    const controller = new AbortController();
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`/api/search/users?q=${encodeURIComponent(searchQuery)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          setSelectedIndex(0);
        }
      } catch (err) {
        // Abort hatalarını yoksay
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchSuggestions();
    }, 150);

    return () => {
      clearTimeout(delayDebounce);
      controller.abort();
    };
  }, [showDropdown, searchQuery]);

  const handleSelectUser = (username: string) => {
    const activeRef = getRef();
    const val = activeRef.current?.value || '';
    const cursor = activeRef.current?.selectionStart || 0;

    const before = val.slice(0, triggerIndex);
    const after = val.slice(cursor);

    const newContent = `${before}@${username} ${after}`;
    
    if (activeRef.current) {
      activeRef.current.value = newContent;
      
      const changeEvent = {
        target: activeRef.current,
      } as any;
      
      onChange(changeEvent);

      // İmleci etiketleme sonrasına odakla
      setTimeout(() => {
        if (activeRef.current) {
          activeRef.current.focus();
          const newCursor = triggerIndex + username.length + 2; // @ + username + boşluk
          activeRef.current.setSelectionRange(newCursor, newCursor);
        }
      }, 10);
    }

    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelectUser(suggestions[selectedIndex].username);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full">
      {as === 'input' ? (
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          className={className}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          required={required}
          className={className}
        />
      )}

      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 top-full mt-1 w-64 rounded-xl border border-border bg-card p-1 shadow-2xl max-h-48 overflow-y-auto"
        >
          {suggestions.map((user, idx) => (
            <button
              type="button"
              key={user.id}
              onClick={() => handleSelectUser(user.username)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors",
                idx === selectedIndex ? "bg-secondary text-primary" : "text-foreground hover:bg-secondary/50"
              )}
            >
              <div className="relative w-6 h-6 rounded-full overflow-hidden border border-border flex-shrink-0 bg-secondary flex items-center justify-center font-bold text-[9px] uppercase">
                {user.avatar_url ? (
                  <Image src={user.avatar_url} alt={user.username} fill className="object-cover" />
                ) : (
                  user.username.slice(0, 2)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-bold leading-tight">{user.display_name ?? user.username}</p>
                <p className="text-[10px] text-muted-foreground truncate">@{user.username}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
