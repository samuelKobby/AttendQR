import Papa from 'papaparse';
import type { StudentCreationData } from '../services/database';

export interface CSVStudentData {
  email: string;
  full_name: string;
  [key: string]: string;  // Allow additional columns
}

export const parseStudentCSV = (file: File): Promise<StudentCreationData[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const students = results.data as CSVStudentData[];
          const processedStudents: StudentCreationData[] = students.map(student => {
            if (!student.email || !student.full_name) {
              throw new Error(`Missing required fields for student: ${JSON.stringify(student)}`);
            }

            // Generate a temporary password using email username and random numbers
            const tempPassword = `${student.email.split('@')[0]}${Math.floor(1000 + Math.random() * 9000)}`;
            
            return {
              email: student.email.trim(),
              full_name: student.full_name.trim(),
              temp_password: tempPassword
            };
          });

          resolve(processedStudents);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};
