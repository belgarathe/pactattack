'use client';

import * as React from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { create } from 'zustand';
import { Toast, ToastActionElement, ToastProps } from './toast';

type ToastData = {
  id: string;
  title?: string;
  description?: string;
  action?: ToastActionElement;
  variant?: ToastProps['variant'];
};

type ToastStore = {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, 'id'>) => void;
  dismissToast: (id: string) => void;
};

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }],
    })),
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));

export function useToast() {
  const { toasts, addToast, dismissToast } = useToastStore();
  return { toasts, addToast, dismissToast };
}

export function Toaster() {
  const { toasts, dismissToast } = useToastStore();

  React.useEffect(() => {
    toasts.forEach((toast) => {
      const timer = setTimeout(() => dismissToast(toast.id), 5000);
      return () => clearTimeout(timer);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toasts]);

  return (
    <ToastPrimitives.Provider>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.variant}
          onOpenChange={(open) => {
            if (!open) dismissToast(toast.id);
          }}
        >
          <div className="grid gap-1">
            {toast.title && <ToastPrimitives.Title>{toast.title}</ToastPrimitives.Title>}
            {toast.description && (
              <ToastPrimitives.Description>{toast.description}</ToastPrimitives.Description>
            )}
          </div>
          {toast.action}
        </Toast>
      ))}
      <ToastPrimitives.Viewport />
    </ToastPrimitives.Provider>
  );
}


