import { supabase } from '../lib/supabase';
import { databaseService } from './database';
import type { StudentCreationData, BulkStudentUploadData } from './database';

export const adminService = {
  async validateAdminRole() {
    const profile = await databaseService.getCurrentProfile();
    if (profile.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }
  },

  async addStudent(data: StudentCreationData) {
    await this.validateAdminRole();
    return databaseService.addStudent(data);
  },

  async bulkAddStudents(data: BulkStudentUploadData) {
    await this.validateAdminRole();
    return databaseService.bulkAddStudents(data);
  },

  async getStudentsInClass(classId: string) {
    await this.validateAdminRole();
    return databaseService.getClassStudents(classId);
  }
};
