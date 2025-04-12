import React from 'react';
import { useForm } from 'react-hook-form';
import type { StudentCreationData } from '../../services/database';

interface StudentFormProps {
  onSubmit: (data: Omit<StudentCreationData, 'temp_password'>) => void;
  isLoading?: boolean;
}

export function StudentForm({ onSubmit, isLoading }: StudentFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<Omit<StudentCreationData, 'temp_password'>>();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          type="email"
          id="email"
          {...register('email', { required: 'Email is required' })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
          Full Name
        </label>
        <input
          type="text"
          id="full_name"
          {...register('full_name', { required: 'Full name is required' })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
        />
        {errors.full_name && (
          <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
      >
        {isLoading ? 'Adding...' : 'Add Student'}
      </button>
    </form>
  );
}
