import { supabase } from '../lib/supabase';
import { databaseService } from './database';
import type { StudentCreationData } from './database';

export const lecturerService = {
  async validateLecturerRole() {
    const profile = await databaseService.getCurrentProfile();
    if (profile.role !== 'lecturer') {
      throw new Error('Unauthorized: Lecturer access required');
    }
    return profile;
  },

  async validateClassOwnership(classId: string) {
    const profile = await databaseService.getCurrentProfile();
    const { data, error } = await supabase
      .from('classes')
      .select('lecturer_id')
      .eq('id', classId)
      .single();

    if (error) throw error;
    if (data.lecturer_id !== profile.id) {
      throw new Error('Unauthorized: You do not own this class');
    }
  },

  async getCurrentLecturerId() {
    const profile = await this.validateLecturerRole();
    return profile.id;
  },

  async addStudentToClass(classId: string, studentData: StudentCreationData) {
    await this.validateLecturerRole();
    await this.validateClassOwnership(classId);
    
    const student = await databaseService.addStudent({
      ...studentData,
      class_id: classId
    });

    return student;
  },

  async getClassStudents(classId: string) {
    await this.validateLecturerRole();
    await this.validateClassOwnership(classId);
    return databaseService.getClassStudents(classId);
  }
};
