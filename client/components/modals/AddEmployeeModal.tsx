import { useState } from 'react';
import { X, User, Loader } from 'lucide-react';
import type { CreateEmployeeDTO, Position } from '@/types/employee.types';
import { EMPLOYEE_VALIDATION } from '@/utils/employee.utils';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEmployeeDTO) => Promise<void>;
  positions: Position[];
  loading?: boolean;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  sap?: string;
  positionId?: string;
}

export function AddEmployeeModal({
  isOpen,
  onClose,
  onSubmit,
  positions,
  loading = false,
}: AddEmployeeModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sap, setSap] = useState('');
  const [positionId, setPositionId] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  // Validation helpers
  const validateFirstName = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Imię jest wymagane';
    }
    if (value.length < EMPLOYEE_VALIDATION.firstName.minLength) {
      return `Imię musi zawierać co najmniej ${EMPLOYEE_VALIDATION.firstName.minLength} znaki`;
    }
    if (value.length > EMPLOYEE_VALIDATION.firstName.maxLength) {
      return `Imię może zawierać maksymalnie ${EMPLOYEE_VALIDATION.firstName.maxLength} znaków`;
    }
    if (!EMPLOYEE_VALIDATION.firstName.pattern.test(value)) {
      return 'Imię może zawierać tylko litery, spacje i myślniki';
    }
    return undefined;
  };

  const validateLastName = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Nazwisko jest wymagane';
    }
    if (value.length < EMPLOYEE_VALIDATION.lastName.minLength) {
      return `Nazwisko musi zawierać co najmniej ${EMPLOYEE_VALIDATION.lastName.minLength} znaki`;
    }
    if (value.length > EMPLOYEE_VALIDATION.lastName.maxLength) {
      return `Nazwisko może zawierać maksymalnie ${EMPLOYEE_VALIDATION.lastName.maxLength} znaków`;
    }
    if (!EMPLOYEE_VALIDATION.lastName.pattern.test(value)) {
      return 'Nazwisko może zawierać tylko litery, spacje i myślniki';
    }
    return undefined;
  };

  const validateSap = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Numer SAP jest wymagany';
    }
    if (!/^\d{8}$/.test(value)) {
      return 'Numer SAP musi zawierać dokładnie 8 cyfr';
    }
    return undefined;
  };

  const validatePositionId = (value: string): string | undefined => {
    if (!value) {
      return 'Stanowisko jest wymagane';
    }
    if (!positions.some((p) => p.id === parseInt(value, 10))) {
      return 'Wybrane stanowisko nie istnieje';
    }
    return undefined;
  };

  const handleFirstNameChange = (value: string) => {
    setFirstName(value);
    if (value) {
      setErrors((prev) => ({
        ...prev,
        firstName: validateFirstName(value),
      }));
    }
  };

  const handleLastNameChange = (value: string) => {
    setLastName(value);
    if (value) {
      setErrors((prev) => ({
        ...prev,
        lastName: validateLastName(value),
      }));
    }
  };

  const handleSapChange = (value: string) => {
    // Only allow digits
    const digitsOnly = value.replace(/\D/g, '').slice(0, 8);
    setSap(digitsOnly);
    if (digitsOnly) {
      setErrors((prev) => ({
        ...prev,
        sap: validateSap(digitsOnly),
      }));
    }
  };

  const handlePositionIdChange = (value: string) => {
    setPositionId(value);
    if (value) {
      setErrors((prev) => ({
        ...prev,
        positionId: validatePositionId(value),
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    const firstNameError = validateFirstName(firstName);
    if (firstNameError) newErrors.firstName = firstNameError;

    const lastNameError = validateLastName(lastName);
    if (lastNameError) newErrors.lastName = lastNameError;

    const sapError = validateSap(sap);
    if (sapError) newErrors.sap = sapError;

    const positionError = validatePositionId(positionId);
    if (positionError) newErrors.positionId = positionError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const data: CreateEmployeeDTO = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        sap: parseInt(sap, 10),
        positionId: parseInt(positionId, 10),
      };

      await onSubmit(data);

      // Reset form
      setFirstName('');
      setLastName('');
      setSap('');
      setPositionId('');
      setErrors({});
    } catch (err) {
      // Error is handled by parent component
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const isValid =
    !errors.firstName &&
    !errors.lastName &&
    !errors.sap &&
    !errors.positionId &&
    firstName.trim() &&
    lastName.trim() &&
    sap.length === 8 &&
    positionId;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm animate-fade-in"
        onClick={handleBackdropClick}
      />

      {/* Modal */}
      <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full animate-slide-up">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-slate-700">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white flex-1">
            Dodaj Nowego Pracownika
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Imię */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Imię
              <span className="text-red-400 ml-1">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={firstName}
              onChange={(e) => handleFirstNameChange(e.target.value)}
              placeholder="np. Jan"
              disabled={loading}
              className={`w-full bg-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.firstName
                  ? 'border border-red-500'
                  : 'border border-slate-600'
              }`}
              aria-label="Imię pracownika"
              aria-describedby={errors.firstName ? 'firstName-error' : undefined}
            />
            {errors.firstName && (
              <p
                id="firstName-error"
                className="text-red-400 text-xs mt-1"
              >
                {errors.firstName}
              </p>
            )}
          </div>

          {/* Nazwisko */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nazwisko
              <span className="text-red-400 ml-1">*</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => handleLastNameChange(e.target.value)}
              placeholder="np. Kowalski"
              disabled={loading}
              className={`w-full bg-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.lastName ? 'border border-red-500' : 'border border-slate-600'
              }`}
              aria-label="Nazwisko pracownika"
              aria-describedby={errors.lastName ? 'lastName-error' : undefined}
            />
            {errors.lastName && (
              <p id="lastName-error" className="text-red-400 text-xs mt-1">
                {errors.lastName}
              </p>
            )}
          </div>

          {/* SAP */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Numer SAP
              <span className="text-red-400 ml-1">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={sap}
              onChange={(e) => handleSapChange(e.target.value)}
              placeholder="12345678"
              maxLength={8}
              disabled={loading}
              className={`w-full bg-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.sap ? 'border border-red-500' : 'border border-slate-600'
              }`}
              aria-label="Numer SAP"
              aria-describedby={errors.sap ? 'sap-error' : 'sap-helper'}
            />
            {errors.sap ? (
              <p id="sap-error" className="text-red-400 text-xs mt-1">
                {errors.sap}
              </p>
            ) : (
              <p id="sap-helper" className="text-slate-400 text-xs mt-1">
                Musi zawierać dokładnie 8 cyfr
              </p>
            )}
          </div>

          {/* Stanowisko */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Stanowisko
              <span className="text-red-400 ml-1">*</span>
            </label>
            <select
              value={positionId}
              onChange={(e) => handlePositionIdChange(e.target.value)}
              disabled={loading}
              className={`w-full bg-slate-700 rounded-lg px-4 py-2 text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.positionId
                  ? 'border border-red-500'
                  : 'border border-slate-600'
              }`}
              aria-label="Stanowisko pracownika"
              aria-describedby={
                errors.positionId ? 'positionId-error' : undefined
              }
            >
              <option value="">Wybierz stanowisko</option>
              {positions.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.name}
                </option>
              ))}
            </select>
            {errors.positionId && (
              <p id="positionId-error" className="text-red-400 text-xs mt-1">
                {errors.positionId}
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={!isValid || loading}
              className="flex-1 px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:shadow-lg hover:shadow-blue-500/50 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Dodawanie...
                </>
              ) : (
                'Dodaj Pracownika'
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 200ms ease-out;
        }

        .animate-slide-up {
          animation: slide-up 200ms ease-out;
        }
      `}</style>
    </div>
  );
}